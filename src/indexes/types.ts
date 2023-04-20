export default interface DataSourceContextIndex {
  search: (query: string) => Promise<string[]>
}
