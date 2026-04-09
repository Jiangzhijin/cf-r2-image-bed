export async function onRequestGet(context) {
  const { env, request } = context;
  
  // 从 Cloudflare 的环境变中读取设置好的管理员密码
  const adminSecret = env.ADMIN_SECRET;
  // 获取前端传过来的密码
  const clientSecret = request.headers.get('X-Auth-Secret');

  if (!adminSecret) {
    return new Response('服务器未设置校验密钥', { status: 500 });
  }

  if (clientSecret !== adminSecret) {
    return new Response('校验失败', { status: 403 });
  }

  return new Response(JSON.stringify({ message: '校验通过' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}