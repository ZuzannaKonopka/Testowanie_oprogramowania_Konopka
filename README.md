# Lista zakupów — Testowanie Oprogramowania

Aplikacja webowa do tworzenia i współdzielenia list zakupów, przygotowana jako projekt laboratoryjny z przedmiotu **Testowanie Oprogramowania**. Projekt zawiera automatyczne testy jednostkowe, integracyjne, systemowe i bezpieczeństwa oraz skrypt do lokalnego pomiaru wydajności.

## Funkcje

- Rejestracja i logowanie użytkownika; hasła są haszowane przy użyciu `scrypt`.
- Tworzenie, odczyt, aktualizacja i usuwanie list zakupów.
- Dodawanie, oznaczanie jako kupione i usuwanie produktów; ilość i jednostka są walidowane.
- Współdzielenie list przez adres e-mail: osoby współdzielące mogą zmieniać status zakupienia, ale nie mogą dodawać ani usuwać pozycji.
- Trwały zapis danych w lokalnym pliku JSON.
- Podstawowe nagłówki bezpieczeństwa, sesyjne cookie `HttpOnly`/`SameSite=Strict`, wymaganie logowania dla API i kontrola dostępu do list.

## Wymagania

- Node.js 20 lub nowszy.
- Nie są wymagane zewnętrzne pakiety npm.

## Uruchomienie aplikacji

```bash
npm start
```

Otwórz `http://127.0.0.1:3000`. Dane zostaną zapisane w katalogu `.data/`. Można zmienić lokalizację przez zmienną `DATA_DIR`, a port przez `PORT`.

## Testy

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:system
npm run test:security
npm run test:coverage
npm run security:check
npm run perf
```

Testy automatyczne korzystają z katalogów tymczasowych, nie modyfikują danych używanej aplikacji i nie wymagają instalacji bibliotek zewnętrznych. Test wydajnościowy domyślnie wykonuje 200 żądań do `/api/health`; ustaw `USERS` i `REQUESTS_PER_USER`, aby zmienić profil.

## Dokumentacja

- [Plan testów](docs/plan-testow.md)
- [Przypadki testowe](docs/przypadki-testowe.md)
- [Raport z testów](docs/raport-z-testow.md)
- [API i scenariusze demonstracyjne](docs/api-i-demo.md)

## Uwaga o zakresie bezpieczeństwa

To aplikacja edukacyjna. `npm run security:check` wykonuje podstawowe automatyczne kontrole, ale nie zastępuje pełnego testu penetracyjnego. Zgodnie z planem należy osobno uruchomić OWASP ZAP na własnym lokalnym środowisku i dołączyć wygenerowany raport, jeśli wymagany jest pełny audyt.
