export function chunkArray(array: any[], chunkSize: number) {
  const result: any[] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}