# INSPIRATION

* https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md
* https://github.com/hoodiehq/hoodie.js/blob/master/CONTRIBUTING.md
* https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md
* https://github.com/twbs/bootstrap/blob/master/CONTRIBUTING.md

# Contributing to Interfake

So you've been using Interfake and have decided that you'd like to help out? Fantastic! There's plenty to do and it could always benefit from another pair of eyes to make it even better and more useful. Hopefully this document will answer some of your questions. Give it a read, and if you're still confused you can to [get in touch](#get-in-touch).

## How to make a bug report

If you've found something which is *demonstrably behaving incorrectly* with Interfake, that's really awesome, because it means there's a great opportunity to improve the tool. Here's some guidelines for bug reports:

1. *Search the repo for Issues*: Use GitHub's search tool to search just this repository with some keywords about the bug you've found. It's possible it has already been reported.
2. **Check if it's really a bug**: It's possible that if you found the bug on the latest release of Interfake, the `master` branch on GitHub has a fix for it. Check it out, try and reproduce the bug using that code and if it's still there, there's probably a real issue.
3. **Create a test case for it**: Try writing a test case for the bug using Interfake's existing test files which can be used to help track down the responsible code. Essentially, extract only the code wrote which caused the bug and strip away everything else.

So, if you're sure you've found a real bug you need to file a bug report. To be as helpful as possible, please try to include **reproduceable steps**, the **test case mentioned above**, and the **environment on which you are running Interfake**.

## How to make a feature request

I'm very welcome to hear ideas for how to add useful new features to Interfake, and there are probably a lot of things that could be added. However, please don't be offended if your idea is rejected. There could be many reasons for why this is happening - it may already be a feature, or it may be too large in scope for a project of this size, or it may just not be in alignment with the aims of the project.

## How to make a Pull Request

I love pull requests! However, there are some guidelines about how to make a good pull request, and how to further the chances of your pull request being merged. Here they are:

1. **Run the unit tests before you're done**: This is the number one golden rule of pull requests. If any of the existing tests in the Interfake test suite fail as a result of the code in your pull request, your request will simply not be accepted. You may be lucky in that a contributor is willing to help make them pass, but it won't be merged until those tests pass.
2. **Write some unit tests to cover your addition**: This is the number one point five golden rule of pull requests. You must create test cases for your feature or fix alongside the existing test cases, and they must pass.

## Code guidelines
