# FP Tools — VPS-сервис

Держит несколько аккаунтов FunPay онлайн (каждый через свой прокси) и отдаёт по
ним актуальную статистику расширению. Лёгкий: один файл + одна зависимость
(`undici`), ~30–60 МБ ОЗУ, лимит 200 МБ в systemd.

## Установка (одна команда, root)

```bash
curl -fsSL https://raw.githubusercontent.com/Kevanko/FunPay-Tools/main/vps/install.sh | bash
```

Безопасно для уже работающих сервисов (remnawave, nginx, панели): **не** трогает
системные пакеты, firewall и порты 80/443. Всё в `/opt/fpt-vps` под пользователем
`fptvps`, свой systemd-юнит `fpt-vps`, свой порт `8787`.

Свой порт: `FPT_PORT=9000 ... | bash`. После установки скрипт печатает **URL** и
**ТОКЕН** — их вставляешь в расширении: **Настройки → VPS**.

## Управление

```bash
systemctl status fpt-vps          # состояние
systemctl restart fpt-vps         # перезапуск
journalctl -u fpt-vps -f          # логи
```

Снести полностью:
```bash
systemctl disable --now fpt-vps && rm -f /etc/systemd/system/fpt-vps.service && rm -rf /opt/fpt-vps && userdel fptvps
```

## API (всё под токеном: `Authorization: Bearer <token>` или `?token=`)

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/health` | проверка живости (без токена) |
| GET | `/stats` | снимки по всем аккаунтам (онлайн/баланс/непрочитанные) |
| GET | `/accounts` | список аккаунтов (без golden_key) |
| POST | `/accounts` | добавить/обновить `{name, golden_key, proxy, autoReply}` |
| DELETE | `/accounts?id=` | удалить аккаунт |

## Безопасность

`golden_key` аккаунтов хранятся в `/opt/fpt-vps/data.json` на этом сервере и в git
**не** попадают. Доступ к серверу = доступ к ключам. Прокси на аккаунт — формат
`http://user:pass@host:port` (HTTP/HTTPS-прокси; SOCKS — позже).

## Объём MVP

Сейчас: онлайн-присутствие + статистика (баланс, непрочитанные, userId) на аккаунт
через свой прокси. Дальше тем же путём: авто-ответ, поднятие лотов, авто-выдача
(новые эндпоинты + цикл).
