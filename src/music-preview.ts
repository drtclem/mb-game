import { TempoMap } from './tempo';
type Section = {start: number; end: number; name: string; action: string};
const audio = document.querySelector<HTMLAudioElement>('#audio')!;
const speed = document.querySelector<HTMLInputElement>('#speed')!;
const status = document.querySelector<HTMLElement>('#status')!;
speed.addEventListener('input', () => {
  audio.playbackRate = Number(speed.value);
  document.querySelector('#rate')!.textContent = `${Math.round(audio.playbackRate * 100)}%`;
});
audio.addEventListener('error', () => { status.textContent = 'Audio could not load. Please reload to try again.'; });
async function setup() {
  const response = await fetch('/music/sunrise-score.json');
  if (!response.ok) throw Error('Score unavailable');
  const score: {beats: number[]; totalCounts: number; sections: Section[]} = await response.json();
  const tempo = new TempoMap(score.beats);
  const rows = score.sections.map(section => {
    const row = document.createElement('li');
    for (const [tag, text] of [['span', `${section.start + 1}–${section.end}`], ['span', section.name], ['b', section.action]]) {
      const el = document.createElement(tag); el.textContent = text; row.append(el);
    }
    document.querySelector('#sections')!.append(row);
    return row;
  });
  status.textContent = 'Ready. Press Play to hear the draft.';
  function update() {
    const count = Math.min(score.totalCounts, Math.max(0, tempo.count(audio.currentTime)));
    const index = score.sections.findIndex(s => count >= s.start && count < s.end);
    document.querySelector('#count')!.textContent = count >= score.totalCounts ? 'Release' : `Count ${Math.floor(count) + 1} / ${score.totalCounts}`;
    document.querySelector('#section')!.textContent = index < 0 ? 'Final decay' : score.sections[index].name;
    rows.forEach((row, i) => row.classList.toggle('active', i === index));
  }
  audio.addEventListener('timeupdate', update);
  audio.addEventListener('seeked', update);
  update();
}
void setup().catch(() => { status.textContent = 'Phrase map could not load. You can still use the audio player.'; });
