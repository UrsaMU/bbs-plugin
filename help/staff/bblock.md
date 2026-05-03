+BBLOCK

Set the read lock on a BBS board with **+bblock**. Staff only.

SYNTAX
  +bblock <#>=<lock>

EXAMPLES
  +bblock 2=all()     Open board 2 for everyone to read.
  +bblock 2=faction   Restrict reading board 2 to faction members.

SEE ALSO: +help bbwritelock, +help bbnewgroup
