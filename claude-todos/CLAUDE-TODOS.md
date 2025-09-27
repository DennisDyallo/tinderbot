Hi Claude. Please check out the HTML and log files in this folder.
They contain info (DOM html, or logs) that will help you fix a certain bug.
The filename and comments in the files will tell you what to address, and possibly suggest a solution.
If you decide to change the code, write unit tests first (TDD style), and finally run the tests (if applicable, some bugs may not be testable with unit tests as we require a real browser environment to reproduce them).
 
Read all of the files first, then decide on the correct order of doing things. Some bugs may depend on others being fixed first.
