BBS — STAFF

Commands for board creation, moderation, and configuration. Staff only.

COMMANDS
  +bbnewgroup <title>[=<cat>]  Create a new board.
  +bbcleargroup <#>            Mark a board for deletion.
  +bbconfirm <#>               Confirm board deletion.
  +bblock <#>=<lock>           Set the read lock on a board.
  +bbwritelock <#>=<lock>      Set the write lock on a board.
  +bbtimeout <#>/<post>=<days> Set post expiry in days.
  +bbconfig [<setting>=<val>]  View or set global BBS config.
  +bbmod <#>=<player>          Add or remove a board moderator.
  +bbcategory <#>=<category>   Set a board's display category.
  +bbwebhook <#>=<url>         Set a Discord webhook for a board.
  +bbarchive <#>               Toggle archive mode on a board.
  +bbreview [<#>]              List flagged posts for review.
  +bbunflag <#>/<post>         Clear flags from a post.

SEE ALSO: +help bbs
