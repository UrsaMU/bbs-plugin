+BBTIMEOUT

Set or clear the expiry timeout on a BBS post with **+bbtimeout**.

SYNTAX
  +bbtimeout <#>/<post>=<days>

EXAMPLES
  +bbtimeout 2/3=30    Set post 3 on board 2 to expire in 30 days.
  +bbtimeout 2/3=0     Remove the expiry timeout from post 3.

SEE ALSO: +help bbconfig, +help bbarchive
