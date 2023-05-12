<<<<<<< HEAD
import { type Row } from '../utils/slacktable';
=======
import { type Row } from '../utils/result-builder.js';
>>>>>>> b9a4e1c (Add support of big result set export, also fix an issue that editing message in the direct message would retrigger the query)

export interface Answer {
  query: string
  hasResult: boolean
  err?: string
  rows?: Row[]
  assumptions?: string
}

export interface Viz {
  image?: Buffer
  hasResult: boolean
}
