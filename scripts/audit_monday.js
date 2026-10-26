const wsUrl = 'ws://127.0.0.1:9223/devtools/page/86C5941197BC84FA0A66BAC127451A82';
const ws = new WebSocket(wsUrl);

let msgId = 1;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('open', async () => {
  try {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const dialog = document.querySelector('._guidePanel_5r1ig_1, [role="dialog"]');
        if (dialog) {
          const btn = Array.from(dialog.querySelectorAll('button, [role="button"]'))
            .find(b => b.innerText?.includes('Empezar ahora') || b.getAttribute('aria-label')?.includes('Cerrar'));
          if (btn) {
            btn.click();
            return { closed: true, buttonText: btn.innerText };
          }
        }
        return { closed: false };
      })()`,
      returnByValue: true
    });

    console.log('Cierre de guía de bienvenida:', res.result.value);
    ws.close();
  } catch (err) {
    console.error('Error:', err);
    ws.close();
  }
});

