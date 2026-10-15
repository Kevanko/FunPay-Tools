"""Native messaging updater for the managed Windows installation of FunPay Tools."""
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import struct
import sys
import tempfile
import urllib.request
import zipfile

HOST_NAME = "tools.funpay.updater"
METADATA_URL = "https://github.com/Kevanko/FunPay-Tools/releases/latest/download/latest.json"
ASSET_PREFIX = "https://github.com/Kevanko/FunPay-Tools/releases/download/"
PRODUCT_DIRS = {"background", "content", "css", "popup", "icons", "fonts", "offscreen", "sounds"}


def version(value):
    parts = str(value).split(".")
    if len(parts) != 3 or any(not p.isdigit() for p in parts):
        raise ValueError("Invalid release version")
    return tuple(map(int, parts))


def download(url, limit):
    request = urllib.request.Request(url, headers={"User-Agent": "FunPay-Tools-Updater", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Download exceeds size limit")
    return data


def validate_archive(data, expected_version):
    files = {}
    seen = set()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        total = 0
        for item in archive.infolist():
            name = item.filename
            path = PurePosixPath(name)
            if "\\" in item.orig_filename or "\0" in item.orig_filename or path.is_absolute() or ".." in path.parts or ":" in name or any(part.endswith((".", " ")) for part in path.parts):
                raise ValueError("Unsafe archive path")
            if item.is_dir():
                continue
            if name.casefold() in seen or (path.parts[0] not in PRODUCT_DIRS and name not in {"manifest.json", "LICENSE"}):
                raise ValueError("Unexpected archive entry: " + name)
            seen.add(name.casefold())
            if (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Symbolic links are not allowed")
            total += item.file_size
            if total > 96 * 1024 * 1024 or item.file_size > 32 * 1024 * 1024:
                raise ValueError("Archive exceeds size limit")
            files[name] = archive.read(item)
    manifest = json.loads(files["manifest.json"])
    if manifest.get("manifest_version") != 3 or manifest.get("name") != "FunPay Tools" or manifest.get("version") != expected_version:
        raise ValueError("Archive manifest does not match release")
    refs = [manifest["background"]["service_worker"], manifest["action"]["default_popup"]]
    refs.extend(manifest.get("icons", {}).values())
    for script in manifest.get("content_scripts", []):
        refs.extend(script.get("js", []) + script.get("css", []))
    if any(ref not in files for ref in refs):
        raise ValueError("Archive is missing extension resources")
    return files


def managed_root():
    # Never update a source checkout or a user-supplied arbitrary directory.
    return Path(os.environ["LOCALAPPDATA"]) / "FunPayTools" / "desktop"


def managed_origin():
    path = str((managed_root() / "extension").resolve())
    if os.name == "nt":
        path = path[0].upper() + path[1:]
    digest = hashlib.sha256(path.encode("utf-16-le") if os.name == "nt" else os.fsencode(path)).hexdigest()[:32]
    return "chrome-extension://" + "".join(chr(97 + int(c, 16)) for c in digest) + "/"


def update(root, fetch=download):
    import time
    root = Path(root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    lock = root / "update.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        # A stale lock from a killed host should not disable updates permanently.
        if time.time() - lock.stat().st_mtime > 600:
            lock.unlink()
            return update(root, fetch)
        raise RuntimeError("Update is already running")
    os.close(descriptor)
    try:
        metadata = json.loads(fetch(METADATA_URL + "?check=" + str(time.time_ns()), 65536))["extension"]
        target_version = metadata["version"]
        version(target_version)
        url, digest = metadata["url"], metadata["sha256"]
        if not url.startswith(ASSET_PREFIX) or not url.endswith(".zip") or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest.lower()):
            raise ValueError("Invalid release metadata")
        active = root / "extension"
        manifest_path = active / "manifest.json"
        current = json.loads(manifest_path.read_text(encoding="utf-8"))["version"] if manifest_path.exists() else "0.0.0"
        if version(target_version) <= version(current):
            return {"ok": True, "updated": False, "version": current}
        archive = fetch(url, 32 * 1024 * 1024)
        if hashlib.sha256(archive).hexdigest() != digest.lower():
            raise ValueError("Release SHA256 mismatch")
        files = validate_archive(archive, target_version)
        with tempfile.TemporaryDirectory(prefix="release-", dir=root) as staging:
            staged = Path(staging) / "extension"
            for name, content in files.items():
                destination = staged.joinpath(*PurePosixPath(name).parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(content)
            backup = root / "previous"
            if backup.exists():
                shutil.rmtree(backup)
            if active.exists():
                active.rename(backup)
            try:
                staged.rename(active)
            except Exception:
                if backup.exists():
                    backup.rename(active)
                raise
        return {"ok": True, "updated": True, "version": target_version}
    finally:
        lock.unlink(missing_ok=True)


def respond(value):
    encoded = json.dumps(value, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)) + encoded)
    sys.stdout.buffer.flush()


def main():
    if "--install" in sys.argv:
        print(json.dumps(update(managed_root())))
        return
    if os.name == "nt":
        import msvcrt
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    header = sys.stdin.buffer.read(4)
    if len(header) != 4:
        return
    length = struct.unpack("<I", header)[0]
    if length > 16384:
        respond({"ok": False, "error": "Request too large"})
        return
    try:
        message = json.loads(sys.stdin.buffer.read(length))
        if len(sys.argv) < 2 or sys.argv[1] != managed_origin():
            respond({"ok": False, "error": "Only the managed extension installation can use this updater"})
            return
        if message.get("action") == "status":
            respond({"ok": True, "managed": True, "hostVersion": 1})
        elif message.get("action") == "update":
            respond(update(managed_root()))
        else:
            respond({"ok": False, "error": "Unsupported action"})
    except Exception as error:
        respond({"ok": False, "error": str(error)})


if __name__ == "__main__":
    main()
