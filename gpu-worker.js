importScripts('https://unpkg.com/gpu.js@2.0.0-rc.23/dist/gpu-browser.min.js')

onmessage = (e) => {
  const { WIDTH, HEIGHT } = e.data

  const DENSITY = 0.12
  const RADIATION = 400
  const FPS = 10

  // init
  const array = []
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    array.push(Math.random() < DENSITY ? 1 : 0)
  }

  const gpu = new GPU()

  const prepare = gpu.createKernel(function (a) {
    return a[this.thread.y][this.thread.x]
  }).setOutput([WIDTH, HEIGHT])

  const reproduction = gpu.createKernel(function (a) {
    // variation
    if (Math.random() < this.constants.RADIATION / this.constants.WIDTH / this.constants.HEIGHT) {
      return Math.round(Math.random() * 2)
    }

    const x = this.thread.x
    const y = this.thread.y

    function checkBoundary(y, x) {
      if (x >= 0 && x < this.constants.WIDTH && y >= 0 && y < this.constants.HEIGHT) {
        return 1
      }
      return 0
    }

    let around = 0
    if (checkBoundary(y - 1, x - 1) === 1) {
      around += a[y - 1][x - 1]
    }
    if (checkBoundary(y - 1, x) === 1) {
      around += a[y - 1][x]
    }
    if (checkBoundary(y - 1, x + 1) === 1) {
      around += a[y - 1][x + 1]
    }
    if (checkBoundary(y, x - 1) === 1) {
      around += a[y][x - 1]
    }
    if (checkBoundary(y, x + 1) === 1) {
      around += a[y][x + 1]
    }
    if (checkBoundary(y + 1, x - 1) === 1) {
      around += a[y + 1][x - 1]
    }
    if (checkBoundary(y + 1, x) === 1) {
      around += a[y + 1][x]
    }
    if (checkBoundary(y + 1, x + 1) === 1) {
      around += a[y + 1][x + 1]
    }

    if (a[y][x] === 1) {
      if (around === 2 || around === 3) {
        return 1
      }
      return 0
    }
    if (around === 3) {
      return 1
    }
    return 0
  })
    .setPipeline(true)
    .setImmutable(true)
    .setOptimizeFloatMemory(true)
    .setStrictIntegers(true)
    .setOutput([WIDTH, HEIGHT])
    .setConstants({ WIDTH, HEIGHT, RADIATION })

  const diff = gpu.createKernel(function (a, b) {
    const x = this.thread.x
    const y = this.thread.y

    if (a[y][x] === b[y][x]) {
      return 0
    }
    if (b[y][x] === 1) {
      return 1
    }
    return -1
  })
    .setImmutable(true)
    .setOptimizeFloatMemory(true)
    .setStrictIntegers(true)
    .setOutput([WIDTH, HEIGHT])

  function nextGeneration(c) {
    const cc = reproduction(c)
    const d = diff(c, cc)
    postMessage(d)
    setTimeout(() => {
      nextGeneration(cc)
    }, 1000 / FPS)
  }

  nextGeneration(prepare(GPU.input(array, [WIDTH, HEIGHT])))

}
