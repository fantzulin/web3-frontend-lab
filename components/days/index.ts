import React from 'react'
import Day1 from './Day1'
import Day2 from './Day2'

const dayComponents: Record<number, React.ComponentType> = {
  1: Day1,
  2: Day2,
}

export default dayComponents
