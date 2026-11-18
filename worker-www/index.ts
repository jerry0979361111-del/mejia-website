// www.mejia.au → https://mejia.au 301 轉址（保留路徑與查詢字串）
export default {
  fetch(req: Request): Response {
    const url = new URL(req.url);
    url.hostname = 'mejia.au';
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  },
};
