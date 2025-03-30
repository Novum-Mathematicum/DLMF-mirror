# DLMF-mirror

This repository is a fully local copy of the [NIST Digital Library of Mathematical Functions (DLMF)](https://dlmf.nist.gov/). For a minimalist version containing just the math and the prose in markdown format, see [`DLMF-markdown`](https://github.com/Novum-Mathematicum/DLMF-markdown).

## Intended use

I made this because I wanted to do classical mathematics and wrangle with those old classical mathematical functions, but I can't remember those obscure functions and their arcane properties. So I thought: "I can't remember these, and I can't figure out the right words to search on Google because Google doesn't take latex inputs. And Wolfram Alpha's AI is quite stupid and useless at fuzzy search... This is the perfect job for modern LLMs, if only they have access to those classical mathematical compendia!"

And thus I had the idea for getting a markdown version of the crown-jewel of human classical mathematics -- the DLMF! Markdown is the best format for LLM ingest, way better than `html`. Sure, I think in a few years, this will be obsoleted, but I think this is still a better use of my time than studying all these things myself, on the off chance that I in the next 5 years would have a use for one of the hundreds of equations in those big books.

This repository is currently intended for use by LLM-human cyborgs, though you are encouraged to use it however you see fit, of course. The suggested use is as follows:

* If you are an LLM working online in RESTful style, then ingest [`DLMF-markdown`](https://github.com/Novum-Mathematicum/DLMF-markdown) via a GitHub API call, such as gitingest.
* Otherwise, download this repo. It contains both the plain markdown files fit for LLM textual ingest, and the rich html files fit for human visuokinesthetic ingest.

## Requirements

`wget`, `curl`, and `python` with beautifulsoup4, which can be installed by `pip install beautifulsoup4`.

## How to reconstruct the local DLMF mirror

### Step 1: grab most of the files by `wget`

```sh
wget -r -l 4 -c --no-parent --convert-links --adjust-extension --page-requisites \
  --regex-type pcre \
  --reject-regex '(\.tex|\.pmml|search/search\?q=|#|/[0-9]+\.[0-9]+\.(T[0-9_]+|E[a-z0-9_]*(\.png)?|F[0-9]+|[ivxlcdm]+)$)' \
  -e robots=off \
  https://dlmf.nist.gov/
```

### Step 2: grab the 3D visualizations

For some bizarre and unknown reason, the 3D visualization webpages (the file names look like `4.15.F10.viz.html`) must be downloaded by impersonating a full browser, and *only* by using `curl`. `wget` simply fails no matter what I tried, even when impersonating a full browser!

As a very concrete example, try `wget` <https://dlmf.nist.gov/33.3.F7.viz> and count the number of occurrences of `<IndexedFaceSet` in the file. It must have exactly 4 of these (as you can verify by going to the website yourself, opening its source code, and search for occurrences of `<IndexedFaceSet`). However, basically every attempt with `wget` results in exactly 3 of those. This would lead to a broken app. Even impersonating a full browser fails.

Only `curl` with full browser impersonation succeeds. So, I wrote `get_viz.sh` to handle those particularly difficult websites.

### Step 3: fix the html links and removing the tracking scripts

If every viz is downloaded correctly, then you can copy `viz_backup` to the main folder.

Now we have to fix the links. There are 3 things to fix.

For the `*.viz.html` files, we need to fix the local links, so that instead of `href="./33.4"` we need to change the `href` to go to `./33.4.html`, and similarly for `src` fields. Specifically, we would check if such a field ends with one of the file extensions, `bib css jpeg jpg js mws pdf png`. If not, then we need to add `.html` to it.

For the other `.html` files, we need to redirect every `href` of the form `http://dlmf.nist.gov/21.4.F3.viz` to one of the form `21.4.F3.viz.html`.

Finally, the `wget` scraper messes up some of the links. For example, this line appears: `./1.1.html:19:<link rel="stylesheet" type="text/css" href="style/LaTeXML.css.html">`, where we see that `style/LaTeXML.css.html` has an extraneous `.html`. Which extensions have those? Run the following and see...

```sh
find . -type f -name "*.html" -exec grep -oE "\.[0-9A-Za-z]*[A-Za-z]+[0-9A-Za-z]*\.html" {} \; | sort -u | sed 's/\.html$//' > results.txt
```

which gives the following:

```txt
.MAN
.SB1
.SB2
.bib
.css
.jpeg
.jpg
.js
.mag
.mws
.pdf
.png
.text
.viz
```

Of these, some are legit:

* `.viz`: These link to the 3D visualizations, such as [DLMF: Figure 9.3.3 ‣ §9.3 Graphics ‣ Airy Functions ‣ Chapter 9 Airy and Related Functions](https://dlmf.nist.gov/9.3.F3.viz).
* `.mag`: These link to larger images, such as [DLMF: Figure 9.3.1 ‣ §9.3 Graphics ‣ Airy Functions ‣ Chapter 9 Airy and Related Functions](https://dlmf.nist.gov/9.3.F1.mag)
* `.SB1`, `.SB2`: These link to the "side bar" images that sometimes appear at the tops of chapters, such as [DLMF: Sidebar 9.SB1: Supernumerary Rainbows ‣ Chapter 9 Airy and Related Functions](https://dlmf.nist.gov/9.SB1)
* `.MAN`: This is an external link, which appears to be dead: <http://www.math.uiuc.edu/documenta/xvol-icm/11/McCoy.MAN.html>
* `.text`: This is also an external link, which also appears to be dead: <https://www.iop.org/EJ/article/0004-637X/554/1/604/53072.text.html>

which leaves the following errors: `bib css jpeg jpg js mws pdf png`. Most of these are obvious, except `mws`... What's that? It turns out to be Maple Classic Worksheet, used by old [Maple](https://en.wikipedia.org/wiki/Maple_(software)).

So the target is clear: fix all those bad extensions, and we'll be off, and while we're at it, remove the trackers too. Fully local *and* private! This is done by the python script `parse_html.py`.

### Optional step 4: Compile a basic html version

The full html mirror is pretty big, and includes a lot of images and such. You can compile a basic version by running `basic_html.sh`. It grabs the following files:

* `front`: The frontmatter, such as the introduction and the foreword.
* `lof`: List of figures.
* `lot`: List of tables.
* `not`: Notations.
* `style`: The files needed for styling the websites, such as the `js` and the `css`.
* `idx`: Index
* `bib`: Bibliography.

This version contains no images.

## How to create the markdown files

1. Download the local mirror of DLMF.
2. Put it into a folder named `html`.
3. Run `python dlmf_to_md_directory.py` to generate the main files.
4. Run `./collate_markdown.sh` to group them into folders.
5. Run `python generate_index.py` to generate the index files.
6. Run `python generate_toc.py` to generate the table of contents (full version and succinct version).

### Notes

Most of the HTML could be directly converted to markdown with minimal change. The only change necessary included:

* `\tag{1.8.6_1}` to `\tag{1.8.6\_1}`

Also, DLMF uses a few minor variants of standard LaTeX:

* `\*` works as an invisible multiplication symbol. It seems to have no effect on the visual presentation of the formulas, and thus is purely semantic.
* `\ifrac{a}{b}` means a fraction `\frac{a}{b}`, but looks like `a / b`. It means "inline fraction".
* `\NVar{a}` means "new variable `a`". It is used exclusively within infoboxes to denote that a symbol has no secret meaning. For example, `\NVar{z}` means, "The symbol `z` really has no special meaning. It does not mean something cool like Riemann's Zeta function. No. It literally is just a variable.". I'm pretty sure `NVar` means "new variable" or maybe "nothing-special variable".
* `\cfracstyle` I don't know what this is supposed to mean, but it only appeared once while talking about the presentation of continued fractions, in Section `1.12`.
