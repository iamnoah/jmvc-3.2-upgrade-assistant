A [JS Shaper][shaper] based script for helping upgrade from JavaScriptMVC 3.1 to JavaScriptMVC 3.2.

Changing all of your steals can be very error prone, so this script tries to do the mudance parts for you. You will probably still discover dependency ordering issues and other pitfalls that were not apparent with the previous version of steal.

# Usage

First, be sure you're in the right directory and that your code is safelt checked in to version control.

    ./upgradeAll.sh /path/to/your/jmvc/app

# Options/Assumptions

`jmvc-upgrader.js` assumes you are using the mustache plugin for your views. Since you're probably not, change `VIEW` and `VIEW_STEAL` to whatever you need (probably `ejs` and `jquery/view/ejs`.)

`upgradeAll.sh` will process every .js file outside of the core JMVC directories. If you want to exclude a directory, add a line following the example in the script.

# Common Problems

## Everything is broken!

Most likely, you didn't declare all of your dependencies in all of your files. The new steal is very, very parallel, so some of your stuff is going to break that worked before. The upgrade script probably had nothing to do with it.

## The script wont run (something about narcisus or jsshaper)

You probably didn't init the [submodules](http://git-scm.com/book/en/Git-Tools-Submodules). jsshaper is a submodule and it has its own submodules, so you may need to init and update both this project and jsshaper.

[shaper]: http://jsshaper.org/
