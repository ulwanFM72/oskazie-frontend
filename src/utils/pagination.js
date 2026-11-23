/** Ambil metadata halaman dari respons paginator Laravel. */
export function pageMeta(response) {
  return {
    current_page: response.current_page,
    last_page: response.last_page,
    total: response.total,
    from: response.from,
    to: response.to,
  }
}
