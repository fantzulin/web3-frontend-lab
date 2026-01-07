import React from 'react'
import Day1 from './Day1'
import Day2 from './Day2'
import Day3 from './Day3'
import Day4 from './Day4'
import Day5 from './Day5'
import Day6 from './Day6'

const dayComponents: Record<number, React.ComponentType> = {
  1: Day1,
  2: Day2,
  3: Day3,
  4: Day4,
  5: Day5,
  6: Day6,
}

export default dayComponents
