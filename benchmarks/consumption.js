/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
const os = require('os')

function getMemoryUsage() {
  const memoryUsage = process.memoryUsage()
  return {
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    external: memoryUsage.external,
  }
}

function getCPUUsage() {
  const cpus = os.cpus()
  const cpuUsage = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0)
    return {
      user: 100 * cpu.times.user / total,
      nice: 100 * cpu.times.nice / total,
      sys: 100 * cpu.times.sys / total,
      idle: 100 * cpu.times.idle / total,
      irq: 100 * cpu.times.irq / total,
    }
  })
  return cpuUsage
}

function startUsageSchedule(mode = '') {
  let tenMinutes = 5 * 60 * 1000
  const interval = 1000
  const usageMemoryList = []
  const usageCPUList = []
  setInterval(() => {
    if (tenMinutes <= 0) {
      console.log(`[${mode}] Memory Average:`, computedMemoryAverage(usageMemoryList))
      console.log(`[${mode}] CPU Average:`, computedCPUAverage(usageCPUList))
      process.exit()
    }
    const memoryUsage = getMemoryUsage()
    usageMemoryList.push(memoryUsage)
    const cpuUsage = getCPUUsage()
    usageCPUList.push(cpuUsage)

    console.log(`[${mode}] Memory Usage:`, `${memoryUsage.heapUsed / 1024 / 1024} MB`)
    // console.log(`[${mode}] CPU Usage:`, `${cpuUsage.map((v, index) => `CPU ${index + 1}: ${v.user}`).join('% \n')}%`)
    tenMinutes -= interval
  }, interval)

  const computedMemoryAverage = (list) => {
    const data = list.reduce((acc, val) => {
      return {
        rss: acc.rss + val.rss,
        heapTotal: acc.heapTotal + val.heapTotal,
        heapUsed: acc.heapUsed + val.heapUsed,
        external: acc.external + val.external,
      }
    }, { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 })
    return {
      rss: data.rss / list.length,
      heapTotal: data.heapTotal / list.length,
      heapUsed: data.heapUsed / list.length,
      external: data.external / list.length,
    }
  }

  const computedCPUAverage = (list) => {
    const data = list.reduce((acc, val) => {
      return val.map((v, i) => {
        return {
          user: acc[i].user + v.user,
          nice: acc[i].nice + v.nice,
          sys: acc[i].sys + v.sys,
          idle: acc[i].idle + v.idle,
          irq: acc[i].irq + v.irq,
        }
      })
    }, list[0])
    return data.map((v) => {
      return {
        user: v.user / list.length,
        nice: v.nice / list.length,
        sys: v.sys / list.length,
        idle: v.idle / list.length,
        irq: v.irq / list.length,
      }
    })
  }
}

module.exports = {
  startUsageSchedule,
}
