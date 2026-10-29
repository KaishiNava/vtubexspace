# VTUBE XSPACE

Website fan-made untuk menjelajahi talent hololive dengan tampilan putih, hitam, dan biru. Dibuat dengan HTML, CSS, dan JavaScript tanpa framework.

## Fitur
- Navigasi hamburger yang membuka halaman Overview, ID, JP, EN, ASOBI★MAWARI-TAI!, Favorit, dan Tentang.
- Daftar talent berbasis JSON.
- Pencarian nama, filter aktif/alumni, profil detail, tautan resmi, dan favorit via localStorage.
- Responsive untuk mobile dan desktop.
- Memprioritaskan JSON dari GitHub RAW, dengan fallback `data/talents.json`.

## Menjalankan
Buka `index.html` melalui static hosting (GitHub Pages, Netlify, Vercel) atau server lokal. Untuk menghindari batasan `fetch` saat membuka `file://`, disarankan memakai static hosting atau local web server.

## Menghubungkan JSON dari GitHub
1. Upload file JSON ke repository GitHub.
2. Klik file JSON → **Raw** → salin alamat RAW.
3. Edit `config.js`:

```js
window.VX_CONFIG = {
  GITHUB_JSON_URL: "https://raw.githubusercontent.com/USERNAME/REPO/main/data/talents.json",
  LOCAL_JSON_URL: "data/talents.json",
  SITE_NAME: "VTUBE XSPACE"
};
```

URL JSON publik bisa dibaca oleh browser. Pastikan repository/file bersifat publik dan format JSON valid. Jika GitHub RAW tidak bisa diakses, website otomatis mencoba data lokal.

## Format JSON
Boleh berupa array langsung atau object dengan properti `talents` / `data`.

```json
{
  "talents": [
    {
      "id": "sample-talent",
      "name": "Sample Talent",
      "nativeName": "サンプル",
      "branch": "ID",
      "generation": "Gen 1",
      "image": "https://example.com/image.jpg",
      "bio": "Deskripsi singkat talent.",
      "debut": "2020-01-01",
      "youtube": "https://youtube.com/@example",
      "twitter": "https://x.com/example",
      "official": "https://hololive.hololivepro.com/en/talents/",
      "status": "active"
    }
  ]
}
```

Field `branch` yang direkomendasikan: `ID`, `JP`, `EN`, `ASOBI`. Field gambar bersifat opsional. Website ini mengenali beberapa variasi nama field umum seperti `photo`, `avatar`, `english_name`, `gen`, `description`, dan `debut_date`.

## Catatan data dan merek
Data di `data/talents.json` adalah contoh awal untuk menguji tampilan, bukan klaim sebagai database lengkap atau real-time. Lengkapi dan perbarui data melalui JSON yang kamu kelola. Nama, gambar, logo, dan merek talent adalah milik pemegang haknya. Proyek ini tidak resmi dan tidak berafiliasi dengan COVER Corp. Periksa ketentuan penggunaan dan izin sebelum menggunakan aset pihak ketiga.


## Troubleshooting jika data tidak muncul
- Pastikan `GITHUB_JSON_URL` di `config.js` adalah URL RAW file, misalnya `https://raw.githubusercontent.com/USERNAME/REPO/main/data/talents.json`.
- Repository dan file JSON harus publik; URL halaman `github.com/.../blob/...` bukan URL RAW.
- Pastikan JSON valid dan bentuknya array atau object dengan properti `talents`/`data`.
- Gunakan static hosting (Vercel/GitHub Pages), bukan membuka `index.html` langsung sebagai `file://`.
- Website kini memberi timeout dan pesan error yang terlihat, lalu mencoba JSON lokal jika GitHub gagal.

## Gambar talent
Tambahkan URL gambar langsung di field `image` untuk tiap talent. Contoh: `"image": "https://example.com/talent.png"`. URL harus publik dan mengarah langsung ke file gambar.

## Filter generasi/unit
Filter subgroup dibuat dari nilai `generation`, `gen`, `unit`, atau `group_name`. Untuk Indonesia, isi nama unit dengan `AREA15`, `holoro`, atau `holoh3ro`. Untuk English gunakan `Myth`, `Promise`, `Advent`, atau `Justice`; untuk Jepang gunakan nama generasi/unit masing-masing.
