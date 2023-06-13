import { type Row } from '../utils/result-builder.js';

export interface Answer {
  query: string
  hasResult: boolean
  err?: string
  rows?: Row[]
  assumptions?: string
  answer?: string
}

export interface Viz {
  image?: Buffer
  hasResult: boolean
}
