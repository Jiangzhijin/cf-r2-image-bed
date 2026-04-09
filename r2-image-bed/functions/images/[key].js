export async function onRequestGet(context) {
  const { env, params } = context;
  const bucket = env.MY_BUCKET;
  const key = params.key; // 从 URL 中解析出的文件名

  if (!key) return new Response('File not found', { status: 404 });

  // 从 R2 读取对象
  const object = await bucket.get(key);

  if (!object) {
    return new Response('File not found', { status: 404 });
  }

  // 这里的处理很重要：将 R2 的元数据应用到 Response Header 中
  const headers = new Headers();
  object.writeHttpMetadata(headers); // 这会设置 content-type
  headers.set('etag', object.httpEtag);
  // 设置缓存，让图片在国内 CF 节点缓存，加快访问速度
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}