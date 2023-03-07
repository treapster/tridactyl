import * as Completions from "@src/completions"
import * as providers from "@src/completions/providers"
import * as config from "@src/lib/config"

class BmarkCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        bmark: browser.bookmarks.BookmarkTreeNode,
    ) {
        super()
        if (!bmark.title) {
            bmark.title = new URL(bmark.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(bmark.title, bmark.url)

        this.html = html`<tr class="BmarkCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${bmark.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${bmark.url}
                    >${bmark.url}</a
                >
            </td>
        </tr>`
    }
}

export class BmarkCompletionSource extends Completions.CompletionSourceFuse {
    public options: BmarkCompletionOption[]
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(["bmarks"], "BmarkCompletionSource", "Bookmarks")

        this._parent.appendChild(this.node)
        this.sortScoredOptions = true
        this.shouldSetStateFromScore =
            config.get("completions", "Bmark", "autoselect") === "true"
    }

    /* override*/ async updateOptions(command, rest) {
        let option = ""
        if (rest.startsWith("-t ")) {
            option = "-t "
            rest = rest.slice(3)
        }
        if (rest.startsWith("-c")) {
            const args = rest.split(" ")
            option += args.slice(0, 2).join(" ")
            option += " "
            rest = args.slice(2).join(" ")
        }

        this.completion = undefined
        this.options = (await providers.getBookmarks(rest))
            .slice(0, 10)
            .map(page => new BmarkCompletionOption(option + page.url, page))

        this.lastExstr = [command, rest].join(" ")
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    updateChain() {
        const query = this.splitOnPrefix(this.lastExstr)[1]

        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query))
        } else {
            this.options.forEach(option => (option.state = "normal"))
        }

        // Call concrete class
        return this.updateDisplay()
    }

    select(option: Completions.CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "bmarks " + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }
}
