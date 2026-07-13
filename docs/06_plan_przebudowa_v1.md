# Plan przebudowy portfolio — spójność + fun to use (v1, 2026-07-13)

**Autor planu:** sesja Mateusz + Claude (Opus). **Wykonanie:** Sonnet, karta po karcie. **Zapas:** AGY.
**Cel nadrzędny:** strona ma wyglądać na żywą i dopieszczoną, nie porzuconą. Hook = pozioma/3D karuzela, więc płynność scrolla to nie kosmetyka, to produkt.

## Zasady pracy z Sonnetem (higiena tokenów — WAŻNE)

1. **Jedna karta = jedna sesja/rozmowa.** Wklejasz Sonnetowi TYLKO treść karty + wymienione w niej pliki. Zakaz zwiedzania repo ("przeczytaj cały projekt" = spalone tokeny).
2. **Zawsze na starcie sesji:** `git fetch && git status` — AGY robi force-pushe; praca na starym stanie = konflikt.
3. **Po każdej karcie:** test w przeglądarce (desktop + telefon!) → commit → push. Mały commit = zielony kwadracik na heatmapie + łatwy rollback.
4. Edytujemy WYŁĄCZNIE `portfolio_deploy` (repo). Stare pliki luzem w `zasoby 2026/` to archiwum — nie tykać, nie mieszać.
5. Konwencja commitów: `feat:` / `fix:` / `docs:` / `perf:`.

## ⚠️ REPO JEST PUBLICZNE — zasady prywatności (obowiązują Sonneta, AGY i każdego agenta)

To repozytorium czyta każdy z internetu. Dlatego bezwzględnie:
1. **Żadnych lokalnych ścieżek** (`C:\Users\...`), nazw użytkownika systemu, nazw prywatnych projektów spoza tego repo.
2. **Żadnych treści z prywatnych worklogów/rozmów** — ani w kodzie, ani w docs, ani w commitach. Do repo trafiają wyłącznie zagregowane liczby (patrz Karta 3).
3. Przed KAŻDYM pushem: przejrzyj `git diff --staged` pod kątem danych prywatnych. Wątpliwość = nie pushuj, zapytaj PM-a.
4. Dane osobowe/zdrowotne/hobby PM-a NIGDY nie są tematem tego repo.

## Znane miny (przeczytaj zanim zaczniesz)

- **Tło strands crashowało GPU w Safari/iOS** (przepełnienie pamięci WebGL — patrz `04_sessions.md`, wpis 2026-06-28 druga sesja). Każde użycie MUSI mieć try/catch + fallback na statyczny `bg.jpg`.
- Appka testowa żyje pod `/projektownik-test/index.html` (chip z nav usunięty celowo 2026-07-13, kod nietknięty).
- W Firestore wisi opublikowany projekt-śmieć **"testowy" (V0.71)** — widać go publicznie na liście projektów. Odpublikować w PROJEKTOWNIKU (baza, nie kod).
- Heatmapa na hero liczy się z Firestore (aktywność projektów), NIE z realnego worklogu — stąd Karta 3.

---

## KARTA 1 — Płynny scroll karuzeli (perf) — ROBIĆ PIERWSZĄ

*Dlaczego pierwsza: strands (Karta 2) dołoży GPU. Bez czystej bazy nie odróżnisz "strands muli" od "strona zawsze muliła".*

**Pliki:** `apps/portfolio/index.html` (całość CSS+JS jest inline w tym jednym pliku).

**Objaw (istotny trop):** szarpie na desktopie (touchpad), na mobile jest płynnie. To wskazuje, że GPU daje radę, a problem leży w obsłudze **wheel/touchpad na desktopie** — najpewniej `scroll-snap-type: y mandatory` walczy z deltami touchpada (snap przerywa inercję przewijania) i/lub render skacze między pozycjami zamiast płynnie interpolować. Zbadać NAJPIERW: usunąć na próbę `scroll-snap` i porównać; alternatywa: własne wygładzanie (lerp aktualnej pozycji do docelowej w rAF) zamiast surowego `scrollTop`.

**Diagnoza przed zmianami:** Chrome DevTools → Performance → nagraj 5 s scrollowania. Szukaj: długich klatek (fioletowe Layout/zielone Paint) i warstw z `backdrop-filter`.

**Podejrzani (w kolejności zysku):**
1. `backdrop-filter: blur(...)` na panelach — 7 paneli × blur = zabójca. Fix: blur tylko na aktywnym panelu, reszta dostaje półprzezroczyste solidne tło `rgba(12,12,14,0.85)` (zgodne z zasadą AGY "Solid Colors w prototypach").
2. `.bg-layer` z `filter: blur(10px)` liczonym na żywo — wypal blur do samego pliku `bg.jpg` (raz, w edytorze grafiki), usuń filter z CSS.
3. Brak `will-change: transform, opacity` na `.panel` — dodać.
4. Panele z `opacity: 0` nadal dostają transform co klatkę — pomijać je w pętli `render()` (early continue) albo `visibility: hidden`.
5. `box-shadow` na 7 panelach — zmniejszyć/uprościć na nieaktywnych.

**Kryterium ukończenia:** scroll bez szarpnięć na laptopie ORAZ na iPhone (test ręką, nie na oko z desktopu). Commit: `perf: smooth carousel scroll`.

## KARTA 2 — Tło strands (React-owe tło z DEMO) na główną

**Skąd brać:** `apps/projektownik-test/js/strands-bg.js` (WebGL2, import `ogl` z unpkg) + sposób inicjalizacji w `apps/projektownik-test/index.html`. Parametry dopasowane wcześniej przez PM-a: scale 3, thickness 0.9, opacity 0.8, speed 0.1.

**Co zrobić:**
1. Skopiować `strands-bg.js` do `apps/portfolio/js/strands-bg.js` (kopiuj, nie linkuj między appkami — izolacja).
2. W `apps/portfolio/index.html`: canvas strands jako warstwa tła POD panelami (z-index pod `.scene`), start w `try...catch`.
3. **Fallback obowiązkowy:** przy błędzie WebGL / `prefers-reduced-motion` / (opcjonalnie) iOS → zostaje obecny statyczny `bg.jpg`. Strona NIGDY nie może się wysypać przez tło.
4. Po wdrożeniu: powtórzyć pomiar z Karty 1. Jak spadnie płynność — zmniejszyć liczbę strandów/rozdzielczość renderera, dopiero potem kombinować.

**Kryterium ukończenia:** animowane tło na desktopie, brak crasha na iPhone (fallback łapie), scroll nadal płynny. Commit: `feat: strands animated background with static fallback`.

## KARTA 3 — Heatmapa zasilana realnym worklogiem (02_worklog)

**Problem:** heatmapa na hero pokazuje aktywność z Firestore (PROJEKTOWNIK), a realna praca PM-a jest logowana lokalnie w plikach worklog (format linii: `- [YYYY-MM-DD] opis (obszar)`; PM prowadzi więcej niż jeden worklog w różnych projektach). Heatmapa kłamie, że nic się nie dzieje.

**TWARDA GRANICA PRYWATNOŚCI:** worklogi zawierają prywatne treści i NIGDY nie trafiają do tego repo — ani w całości, ani we fragmentach, ani jako nazwy obszarów. Jedyne, co wolno commitować, to zagregowany JSON postaci `{"YYYY-MM-DD": liczba}` — same daty i liczby, zero tekstu. Ścieżki do worklogów podaje PM ręcznie jako argumenty przy uruchomieniu skryptu (nie zapisujemy ich w repo, nie hardkodujemy w skrypcie).

**Rozwiązanie (świadomie proste, bez automatyzacji na start):**
1. Nowy skrypt `tools/worklog2json.js` (Node, zero zależności): przyjmuje 1..N ścieżek do worklogów jako argumenty, regexem `^- \[(\d{4}-\d{2}-\d{2})\]` zlicza wpisy per data (sumując wszystkie źródła), zapisuje `apps/portfolio/data/worklog_activity.json` w formacie `{"2026-07-13": 3, ...}`. Skrypt NIE zapisuje nigdzie treści wpisów.
2. W `apps/portfolio/index.html`, w miejscu wywołania `renderGlobalHeatmap(globalActivity)`: przed renderem `fetch('data/worklog_activity.json')` i scalić z `globalActivity` (sumować per data; fetch w try/catch — brak pliku nie może wywalić strony).
3. Rytuał (dopisać do rutyny końca sesji): `node tools/worklog2json.js <ścieżki worklogów>` → **przejrzyj diff JSON-a (tylko daty+liczby!)** → commit → push. Bonus: każdy taki push = kwadracik też na GitHubie.
4. (Później, opcjonalnie, NIE teraz): automat w n8n. Najpierw niech ręczny obieg pożyje tydzień.

**Kryterium ukończenia:** heatmapa pokazuje realne dni pracy z worklogów (sprawdzić tooltipy dat), pusty/brakujący JSON niczego nie psuje, w repo nie ma ani jednego słowa z worklogów. Commit: `feat: heatmap fed by aggregated activity data`.

## KARTA 4+ — Treści, karta po karcie (z Sonnetem, po jednej na sesję)

Kolejność wg wpływu na "nie wygląda na porzuconą":
1. **Panel RAPORTY** — ostatni raport jest z 26.06. Albo dodać świeży raport (przez + DODAJ RAPORT), albo zmienić nagłówek sekcji tak, żeby nie sugerował dziennika ("wybrane raporty" zamiast build-in-public-kroniki). Nic nie postarza strony bardziej niż stary "najnowszy" wpis.
2. **Panel PROJEKTY / pipeline** — odpublikować "testowy" (Firestore), zweryfikować wersje (v0.51 portfolio vs realny stan), nazwy mają być zrozumiałe dla obcego.
3. **Hero** — copy OK, ale sprawdzić literówki i czy heatmapa (po Karcie 3) dobrze siedzi wizualnie.
4. **Spójność z Useme** (zrobione 2026-07-13: Automation w skills, chip USEME, EMAIL, logo `creative_ai_driven_pm_`) — przy każdej zmianie treści pilnować, żeby stack się nie rozjechał z profilem Useme.

---

**Kolejność wykonania: 1 → 2 → 3 → 4.** Nie zaczynać Karty 2 przed zamknięciem Karty 1.
