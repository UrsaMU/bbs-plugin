+BBCONFIG

View or set global BBS configuration with **+bbconfig**. Staff only.

SYNTAX
  +bbconfig [<setting>=<value>]

EXAMPLES
  +bbconfig                     Show current global BBS settings.
  +bbconfig timeout=30          Set default post timeout to 30 days.
  +bbconfig autotimeout=on      Enable automatic post expiry.
  +bbconfig autotimeout=off     Disable automatic post expiry.

SEE ALSO: +help bbtimeout, +help bbarchive
