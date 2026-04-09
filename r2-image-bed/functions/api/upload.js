// 生成随机文件名的简易函数
function generateRandomName() {
  return Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

// 注意这里必须是 onRequestPost ！！！
export async function onRequestPost(context) {
  const { env, request } = context;
  
  // 鉴权
  const adminSecret = env.ADMIN_SECRET;
  const clientSecret = request.headers.get('X-Auth-Secret');
  if (!adminSecret || clientSecret !== adminSecret) return new Response('Unauthorized', { status: 401 });

  const bucket = env.MY_BUCKET;

  // 解析 Form Data
  const formData = await request.formData();
  const file = formData.get('file'); // 获取文件对象
  const originalName = formData.get('filename'); // 前端传来的文件名

  if (!file) {
    return new Response('No file found', { status: 400 });
  }

  // 生成新的文件名（保留原后缀）
  const ext = originalName.split('.').pop();
  const newKey = generateRandomName() + '.' + ext;

  // 获取文件二进制数据
  const body = file.stream();

  // 写入 R2
  await bucket.put(newKey, body, {
    httpMetadata: {
      contentType: file.type // 保持正确的 content-type，方便浏览器直接预览
    }
  });

  return new Response(JSON.stringify({ key: newKey }), { status: 200 });
}
