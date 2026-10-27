let recognition = null;
let listening = false;

export function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function ttsSupported() {
  return 'speechSynthesis' in window;
}

export function startListening({ lang = 'ru-RU', onPartial, onFinal, onError, onEnd } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError?.('Speech recognition is not supported in this browser.');
    return false;
  }
  stopListening();
  recognition = new SR();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  listening = true;

  recognition.onresult = (ev) => {
    let interim = '';
    let final = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) final += t;
      else interim += t;
    }
    if (interim) onPartial?.(interim);
    if (final) onFinal?.(final);
  };
  recognition.onerror = (e) => onError?.(e.error || 'speech-error');
  recognition.onend = () => {
    listening = false;
    onEnd?.();
  };
  recognition.start();
  return true;
}

export function stopListening() {
  try { recognition?.stop(); } catch { /* ignore */ }
  listening = false;
}

export function isListening() {
  return listening;
}

export function speak(text, { lang = 'ru-RU' } = {}) {
  if (!ttsSupported() || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/[#>*_`]/g, ' ').slice(0, 1200));
  u.lang = lang;
  u.rate = 1.02;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
