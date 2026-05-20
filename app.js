// ✅ SET THIS to your Worker URL (we'll create it in Step 2)
const WORKER_BASE = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev";

const statusEl = document.getElementById("status");
const workerEl = document.getElementById("workerUrl");
workerEl.textContent = WORKER_BASE;

function setStatus(msg){ statusEl.textContent = "Status: " + msg; }

async function getVapidPublicKey(){
  const res = await fetch(WORKER_BASE + "/vapidPublicKey");
  if (!res.ok) throw new Error("Failed to get VAPID public key");
  return await res.text();
}

function b64ToUint8Array(base64String){
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i=0; i<rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function enablePush(){
  if (!("serviceWorker" in navigator) || !("PushManager" in window)){
    alert("Push not supported on this browser.");
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted"){
    setStatus("Permission not granted");
    return;
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  const vapidPublicKey = await getVapidPublicKey();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8Array(vapidPublicKey)
  });

  const name = (localStorage.getItem("userName") || "").trim();
  const role = (localStorage.getItem("userRole") || "").trim();

  const resp = await fetch(WORKER_BASE + "/subscribe", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), name, role })
  });

  if (!resp.ok) throw new Error("Subscribe API failed");
  setStatus("Enabled ✅");
}

async function disablePush(){
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { setStatus("No service worker"); return; }

  const sub = await reg.pushManager.getSubscription();
  if (sub){
    await fetch(WORKER_BASE + "/unsubscribe", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint })
    });
    await sub.unsubscribe();
  }
  setStatus("Disabled");
}

document.getElementById("btnEnable").onclick = () => enablePush().catch(e => {
  console.error(e); alert(e.message); setStatus("Error");
});
document.getElementById("btnDisable").onclick = () => disablePush().catch(e => {
  console.error(e); alert(e.message); setStatus("Error");
});

setStatus("Ready");
