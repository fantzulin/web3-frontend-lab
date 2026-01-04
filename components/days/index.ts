import React from 'react'
import Day1 from './Day1'
import Day2 from './Day2'
import Day3 from './Day3'

const dayComponents: Record<number, React.ComponentType> = {
  1: Day1,
  2: Day2,
  3: Day3,
}

export default dayComponents
