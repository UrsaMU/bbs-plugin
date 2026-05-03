+BBWRITELOCK

Set the write lock on a BBS board with **+bbwritelock**. Staff only.

SYNTAX
  +bbwritelock <#>=<lock>

EXAMPLES
  +bbwritelock 2=all()     Allow anyone to post to board 2.
  +bbwritelock 2=faction   Only faction members may post to board 2.

SEE ALSO: +help bblock, +help bbnewgroup
