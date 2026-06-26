# Projekt: Creative PM Monorepo
# Podstawowa Filozofia: Cross-Platform Blocks (Współdzielona Mechanika)

1. **Jeden Blok, Wiele Perspektyw:** Bloki są głównym wspólnym językiem (nośnikiem) informacji pomiędzy Projektownikiem a Kreatorem. 
2. **Projektownik (2D Infinite Canvas):** Służy do ideacji, "zrzucania brudnopisu" i wolnego układania. Bloki mają tutaj współrzędne (x, y). Użytkownik wrzuca do nich luźne "śmieci" (zdjęcia, linki, notatki) traktując Blok jako kontener na zbierany input. Przypięte "śmieci" są widoczne wokół / pod blokiem.
3. **Kreator (Linear Document):** Służy do rozpisania i obróbki zebranych myśli. Kreator zasysa te same Bloki z bazy. Otwiera się je tu jak "glimpse Worda". W Kreatorze bloki są ułożone wertykalnie (góra-dół). Ich kolejność (tzw. `creatorOrder`) jest niezależna od położenia X,Y na płótnie Projektownika. 
4. **Transport Wnętrza:** Zawartość (brudnopis), którą użytkownik zebrał pod blokiem w Projektowniku, MUSI transportować się do Kreatora, by użytkownik miał do niej wgląd podczas obróbki tekstu (jak podczas pracy w Confluence).

**Zasada Programistyczna:** Mechanika Bloków musi być "współdzielona" i zunifikowana na poziomie bazy danych (Firebase). Unikamy duplikacji logiki w `apps/creator` i `apps/projektownik`. Kreator i Projektownik czytają tę samą paczkę informacji (Bloki z kolekcji), ale renderują ją na własny, specyficzny dla swojego interfejsu sposób.
