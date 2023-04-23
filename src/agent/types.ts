import { type Row } from '../utils/slacktable.js';

export interface Answer {
  query: string
  hasResult: boolean
  err?: string
  rows?: Row[]
}

export interface Viz {
  image?: Buffer
  hasResult: boolean
}
