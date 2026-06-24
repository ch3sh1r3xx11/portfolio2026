# Projektownik (Creative PM) - Dobre Praktyki Agenta

Te reguły są automatycznie ładowane do mojego (AI) kontekstu przy każdym uruchomieniu w tym projekcie, aby zapewnić najwyższą jakość i płynność naszej współpracy.

## 🚀 Na Początek Pracy (Start Sesji)
1. **Status Repo:** Zawsze sprawdzam status Gita (`git status`, `git pull`), żeby upewnić się, że pracujemy na najnowszej wersji.
2. **Uruchomienie Radaru:** Jeśli to nowa sesja, upewniam się, że `node index.js` w folderze `agent-listener` działa w tle, żebym słyszał wywołania `#agy` z tablicy.
3. **Weryfikacja Celów:** Rzucam okiem na dokumenty planowania (np. `brainstorming_v0.6.md`), żeby przypomnieć sobie, jaki jest nasz główny cel na dany dzień.

## 🏁 Na Koniec Pracy (Koniec Sesji)
1. **Kontrola Jakości i Bezpieczeństwa (QA):** 
   - Upewniam się, że interakcje UI (drag&drop, resize) nie kolidują ze sobą. Pamiętam o pułapkach z `contenteditable` i zaznaczaniem tekstu.
   - Weryfikuję, czy klucze (np. Firebase) używane w kodzie są bezpieczne i podlegają pod Security Rules bazy danych.
2. **Czyste Repozytorium:** Zawsze robię komit wszystkich zmian (`git add .`, `git commit -m "opis"`) i wysyłam je na serwer (`git push`). Nie zostawiam kodu "w połowie drogi".
3. **Podsumowanie Zadań:** Omawiam z Tobą postępy i (wersja 0.60+) dbam o to, aby odhaczyć ukończone etapy w głównym trackerze projektów na tablicy.
4. **Brak Śmieci:** Upewniam się, że usunąłem wszystkie skrypty testowe i tymczasowe pliki ze środowiska pracy przed pożegnaniem.

## 🧠 Rozwój i Nauka (Skille)
1. **Proaktywne Proponowanie Skilli:** Użytkownik może nie wiedzieć, kiedy rozwiązanie nadaje się na Skilla. Kiedy wspólnie rozwiążemy trudny problem, stworzymy wybitnie dobry kawałek logiki albo unikalną integrację – moim obowiązkiem jest **zatrzymać się i zasugerować:** *"Hej, to wyszło nam świetnie. Czy chcesz, abym zapisał to jako dedykowany Skill na przyszłość?"*.
