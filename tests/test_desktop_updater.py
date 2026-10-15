import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("updater", Path(__file__).parents[1] / "desktop/updater_host.py")
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def archive(version="9.0.0", extra=None):
    data = io.BytesIO()
    manifest = {"name": "FunPay Tools", "version": version, "manifest_version": 3, "background": {"service_worker": "background/main.js"}, "action": {"default_popup": "popup/main.html"}}
    with zipfile.ZipFile(data, "w") as output:
        for name, value in {"manifest.json": json.dumps(manifest), "background/main.js": "", "popup/main.html": "", **(extra or {})}.items():
            entry = zipfile.ZipInfo(name)
            entry.filename = name  # Preserve deliberately unsafe Windows paths in this fixture.
            output.writestr(entry, value)
    return data.getvalue()


class DesktopUpdaterTests(unittest.TestCase):
    def test_download_install_and_idempotence_keep_browser_data_outside_install(self):
        data = archive()
        metadata = {"extension": {"version": "9.0.0", "url": updater.ASSET_PREFIX + "v9.0.0/extension.zip", "sha256": hashlib.sha256(data).hexdigest()}}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "browser-profile").mkdir()
            marker = root / "browser-profile" / "settings"
            marker.write_text("preserved")
            (root / "extension").mkdir()
            (root / "extension" / "manifest.json").write_text('{"version":"8.0.0"}')
            fetch = lambda url, limit: json.dumps(metadata).encode() if "latest.json" in url else data
            self.assertTrue(updater.update(root, fetch)["updated"])
            self.assertFalse(updater.update(root, fetch)["updated"])
            self.assertEqual(marker.read_text(), "preserved")
            self.assertEqual(json.loads((root / "previous" / "manifest.json").read_text())["version"], "8.0.0")

    def test_bad_hash_does_not_modify_current_install(self):
        metadata = {"extension": {"version": "9.0.0", "url": updater.ASSET_PREFIX + "v9.0.0/extension.zip", "sha256": "0" * 64}}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with self.assertRaisesRegex(ValueError, "SHA256"):
                updater.update(root, lambda url, limit: json.dumps(metadata).encode() if "latest.json" in url else archive())
            self.assertFalse((root / "extension").exists())

    def test_zip_traversal_unexpected_files_symlinks_and_wrong_version_rejected(self):
        for name in ("../secret", "C:/escape", "background/../../escape", "AGENTS.md", "android/a.java", "background\\escape", "background/main.js.", "background/MAIN.js"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                updater.validate_archive(archive(extra={name: "bad"}), "9.0.0")
        with self.assertRaises(ValueError):
            updater.validate_archive(archive(), "8.0.0")

    def test_symlink_resource_is_rejected(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as output:
            entry = zipfile.ZipInfo("background/shortcut")
            entry.create_system = 3
            entry.external_attr = 0o120777 << 16
            output.writestr(entry, "../../outside")
        with self.assertRaisesRegex(ValueError, "Symbolic"):
            updater.validate_archive(data.getvalue(), "9.0.0")

    def test_newer_local_build_is_not_downgraded(self):
        metadata = {"extension": {"version": "8.0.0", "url": updater.ASSET_PREFIX + "v8.0.0/extension.zip", "sha256": "0" * 64}}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "extension").mkdir()
            (root / "extension" / "manifest.json").write_text('{"version":"9.0.0"}')
            self.assertFalse(updater.update(root, lambda url, limit: json.dumps(metadata).encode())["updated"])


if __name__ == "__main__":
    unittest.main()
