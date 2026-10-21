# Plan testów — Lista zakupów

**Projekt:** Testowanie Oprogramowania — Zuzanna Konopka  
**Wersja dokumentu:** 1.0.0  
**Status:** plan i zestawy testowe; wyniki należy aktualizować po wykonaniu testów na docelowym środowisku.

## 1. Cel i zakres

Celem jest sprawdzenie aplikacji do zarządzania listami zakupów. Plan obejmuje testy jednostkowe, integracyjne, systemowe, wydajnościowe oraz kontrolę podstawowych zabezpieczeń. Aplikacja obsługuje rejestrację, logowanie, listy zakupów, pozycje list, współdzielenie oraz zmianę statusu zakupienia.

## 2. Środowisko i narzędzia

- Node.js 20 lub nowszy; aplikacja korzysta wyłącznie z modułów wbudowanych Node.js.
- `node:test` i `node:assert/strict` — testy automatyczne.
- `fetch` — testowanie REST API i scenariuszy systemowych.
- Skrypt `performance/load-test.js` — lokalne obciążenie endpointu health.
- Skrypt `security/security-check.js` — kontrola bazowych nagłówków, uwierzytelniania, cookie i walidacji.
- OWASP ZAP — dodatkowy skan dynamiczny uruchamiany osobno na lokalnie uruchomionej aplikacji.

## 3. Warunki i ograniczenia

1. Testy automatyczne używają osobnych katalogów tymczasowych, dlatego nie korzystają z danych użytkownika ani z lokalnej bazy aplikacji.
2. Hasła testowe są fikcyjne. Nie wolno umieszczać prawdziwych haseł ani tokenów w repozytorium.
3. Test obciążeniowy dotyczy lokalnego endpointu `/api/health`; nie reprezentuje pełnego obciążenia przepływu zakupowego.
4. Testy OWASP ZAP należy uruchamiać wyłącznie wobec własnej aplikacji i lokalnego adresu testowego.
5. Testy automatyczne nie zastępują przeglądu kodu, testów dostępności ani pełnego audytu penetracyjnego.

## 4. Testy jednostkowe

| ID | Obszar | Dane / działanie | Oczekiwany rezultat |
|---|---|---|---|
| UT-01 | E-mail | Poprawny adres | Akceptacja |
| UT-02 | E-mail | Brak domeny lub `@` | Odrzucenie |
| UT-03 | Hasło | Długość poniżej 10 znaków | Odrzucenie |
| UT-04 | Nazwa listy | Pusta nazwa lub ponad 100 znaków | Odrzucenie |
| UT-05 | Produkt | Poprawna nazwa, ilość i jednostka | Normalizacja danych |
| UT-06 | Produkt | Ilość zero/ujemna lub nieznana jednostka | Odrzucenie |
| UT-07 | Uprawnienia | Właściciel, współdzielący, obcy użytkownik | Rozróżnienie uprawnień |
| UT-08 | Haszowanie hasła | Weryfikacja poprawnego i błędnego hasła | Tylko poprawne hasło przechodzi |

## 5. Testy integracyjne

| ID | Obszar | Dane / działanie | Oczekiwany rezultat |
|---|---|---|---|
| IT-01 | Rejestracja i logowanie | Nowy użytkownik | Konto utworzone, sesja wydana po logowaniu |
| IT-02 | API list | Utworzenie listy i pobranie po ID | Lista zwrócona z poprawnymi danymi |
| IT-03 | API produktów | Dodanie poprawnego produktu | Produkt zapisany i widoczny na liście |
| IT-04 | Walidacja API | Pusta nazwa, ilość 0 | HTTP 400, brak zapisu |
| IT-05 | Współdzielenie | Właściciel udostępnia listę | Użytkownik docelowy uzyskuje dostęp |
| IT-06 | Uprawnienia współdzielenia | Współdzielący próbuje dodać/usunąć produkt | HTTP 403 |
| IT-07 | Typ treści | JSON wysłany jako `text/plain` | HTTP 415 |

### Uzasadnienie danych integracyjnych

Użyto typowych danych biznesowych (`Mleko`, `Chleb`) i jednostek obsługiwanych przez aplikację. Przypadki negatywne obejmują wartości puste, ilość zero i nieobsługiwane jednostki, ponieważ sprawdzają walidację oraz zapobiegają zapisaniu niepoprawnych rekordów. Testy używają oddzielnych, tymczasowych magazynów danych.

## 6. Testy systemowe

| ID | Scenariusz | Oczekiwany rezultat |
|---|---|---|
| ST-01 | Otwarcie strony głównej | HTTP 200, widoczny tytuł aplikacji |
| ST-02 | Rejestracja użytkownika | Konto zostaje utworzone |
| ST-03 | Logowanie | Użytkownik otrzymuje sesję |
| ST-04 | Utworzenie listy z datą | Lista jest widoczna na koncie |
| ST-05 | Dodanie produktu | Produkt pojawia się na liście |
| ST-06 | Oznaczenie produktu jako kupionego | Status zmienia się na `purchased=true` |
| ST-07 | Usunięcie produktu i listy | Zasoby zostają usunięte |
| ST-08 | Wylogowanie i wejście do API | Sesja unieważniona, API zwraca HTTP 401 |

### Uzasadnienie danych systemowych

Scenariusz używa fikcyjnego konta, listy `Zakupy weekendowe` i produktu `Jabłka`. Są to czytelne dane, które obejmują pełny cykl życia najważniejszych obiektów. Osobny scenariusz weryfikuje próbę dostępu bez uwierzytelnienia.

## 7. Testy wydajnościowe

**Narzędzie:** `performance/load-test.js`  
**Domyślny profil:** 10 równoległych workerów, po 20 żądań na worker (200 żądań).  
**Mierzone metryki:** czas całkowity, żądania na sekundę, błędy, minimum, mediana, p95 i p99 czasu odpowiedzi.  
**Powtarzalność:** `USERS=10 REQUESTS_PER_USER=20 npm run perf`. Parametry można zmienić zmiennymi środowiskowymi; skrypt ogranicza zakres, aby uniknąć przypadkowego nadmiernego obciążenia.  
**Kryteria obserwacyjne:** brak błędów HTTP/transportowych; porównanie p95 i przepustowości między kolejnymi uruchomieniami na tym samym środowisku. Progi akceptacji należy ustalić po pomiarze bazowym i wymaganiach prowadzącego.

Wyniki skrypt zapisuje w `performance/results-*.json`. Nie wpisuje się do dokumentacji wyników przed wykonaniem pomiaru.

## 8. Audyt bezpieczeństwa

Automatyczne kontrole obejmują:

- brak dostępu do prywatnego API bez sesji;
- `HttpOnly` i `SameSite=Strict` dla cookie sesyjnego;
- nagłówki CSP, `X-Frame-Options`, `X-Content-Type-Options` i `Referrer-Policy`;
- walidację danych wejściowych i długości hasła;
- separację list pomiędzy użytkownikami;
- ograniczenie operacji edycji listy dla współdzielących.

### Dodatkowy skan OWASP ZAP

1. Uruchom aplikację poleceniem `npm start`.
2. Otwórz `http://127.0.0.1:3000` i wykonaj podstawowe scenariusze ręcznie.
3. Uruchom OWASP ZAP i wskaż wyłącznie `http://127.0.0.1:3000` jako cel.
4. Wykonaj pasywny skan; aktywne skanowanie tylko na własnym lokalnym środowisku testowym.
5. Zapisz raport HTML i uzupełnij wnioski o nazwę alertu, poziom ryzyka, dowód, wpływ oraz rekomendowaną poprawkę.

**Ważne:** `npm run security:check` jest zestawem podstawowych kontroli, a nie pełnym audytem OWASP ZAP. Brak alertów w tych kontrolach nie dowodzi braku podatności.

## 9. Uruchamianie zestawów

- Wszystkie: `npm test`
- Jednostkowe: `npm run test:unit`
- Integracyjne: `npm run test:integration`
- Systemowe: `npm run test:system`
- Bezpieczeństwa: `npm run test:security`
- Pokrycie kodu: `npm run test:coverage`
- Obciążenie: `npm run perf`
- Kontrole bezpieczeństwa: `npm run security:check`

## 10. Raportowanie

Po każdym uruchomieniu zapisać datę, wersję kodu, środowisko, polecenie, liczbę testów zaliczonych/niezaliczonych, błędy oraz wnioski. Raport końcowy znajduje się w `docs/raport-z-testow.md` i musi odzwierciedlać rzeczywiste wyniki.
