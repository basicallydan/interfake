# Contributing to Interfake

So you've been using Interfake and have decided that you'd like to help out? Fantastic! There's plenty to do and it could always benefit from another pair of eyes to make it even better and more useful. Hopefully this document will answer some of your questions. Give it a read, and if you're still confused you can to [get in touch](#get-in-touch).

## Goals

Once upon a time, someone needed an "easier way than Sinatra" to spin up some test APIs for a bunch of iPhone UI tests. Soon, Interfake was born and allowed JSON files to be easily turned into APIs. Once the fluent interface was developed, things took off. It is fairly easy to summarise the goals of the project:

> Provide a simple way to *define* JSON-based HTTP APIs

In doing so, Interfake should...

1. Not impose strong opinions about how an API should look
2. Keep dependencies to a minimum
3. Improve productivity for developers at any level of the stack
4. Work on a wide range of platforms

As well as that, anybody working on Interfake should strive to:

1. Keep the code well-covered by tests
2. Take strong measures to *not* break the existing interface for developers
3. Enjoy themselves. If it ever becomes a chore, then you shouldn't feel obliged to continue :)

So without further ado, here's some recommendations of how to get started!

## How to make a bug report

If you've found something which is *demonstrably behaving incorrectly* with Interfake, that's really awesome, because it means there's a great opportunity to improve the tool. Here's some guidelines for bug reports:

1. *Search the repo for Issues*: Use GitHub's search tool to search just this repository with some keywords about the bug you've found. It's possible it has already been reported.
2. **Check if it's really a bug**: It's possible that if you found the bug on the latest release of Interfake, the `master` branch on GitHub has a fix for it. Check it out, try and reproduce the bug using that code and if it's still there, there's probably a real issue.
3. **Create a test case for it**: Try writing a test case for the bug using Interfake's existing test files which can be used to help track down the responsible code. Essentially, extract only the code wrote which caused the bug and strip away everything else.

So, if you're sure you've found a real bug you need to file a bug report. To be as helpful as possible, please try to include **reproduceable steps**, the **test case mentioned above**, and the **environment on which you are running Interfake**.

## How to make a feature request

I'm very welcome to hear ideas for how to add useful new features to Interfake, and there are probably a lot of things that could be added. However, please don't be offended if your idea is rejected. There could be many reasons for why this is happening - it may already be a feature, or it may be too large in scope for a project of this size, or it may just not be in alignment with the aims of the project.

1. **Search through the existing issues for your feature**: If you find it, give it a :+1: (`:+1:`) and await a response. If it's been rejected, move on :) If you don't find it...
2. **Create an issue!** Please try to be as descriptive as possible with your feature, and mention in the title of the issue that it is a feature request so it can be tagged as such. I'll review it, but if it isn't appropriate, again, **please** don't take it personally. I mean you no offense :)

## How to make a Pull Request

I love pull requests! However, there are some guidelines about how to make a good pull request, and how to further the chances of your pull request being merged. Here they are:

1. **Run the unit tests before you're done**: This is the number one golden rule of pull requests. If any of the existing tests in the Interfake test suite fail as a result of the code in your pull request, your request will simply not be accepted. You may be lucky in that a contributor is willing to help make them pass, but it won't be merged until those tests pass.
2. **Write some unit tests to cover your addition**: This is the number one point five golden rule of pull requests. You must create test cases for your feature or fix alongside the existing test cases, and they must pass.
3. **Make your pull request**: If you don't know how to do this, I recommend you read this [excellent GitHub help article](https://help.github.com/articles/creating-a-pull-request).
4. **Wait**: I will have a look. If your request is useful it may still take a while to be merged, and it's possible that you will be asked to change a couple of things - or I might change a couple of things myself. Whatever the case, please co-operate, it's for the good of the project.

## Code Guidelines

Please try to keep to the same style used throughout Interfake. In general, it favours brevity over verbosity for public interfaces, but verbosity where it helps in private interfaces and variables. In other words, keep things as short and intuitive as possible. No crucial variables called things like `grMod` or anything strange and obfuscated like that.

Also, we use tabs, not spaces. No, this doesn't mean tabs are better than spaces. I just chose tabs, and we're sticking with it.

## Versioning

Please **do not include version bumps in your pull requests**. If you have a bug fix by all means make a pull request with it, but don't bump the version. This is the responsibility of official contributors (currently just @basicallydan). If you'd like to be an official contributor, please make some contributions first, and then get in touch if you think you can make a lasting, more permanent contribution to the project.

# Thanks!

Thanks for reading this, it's important we're all on the same page for a project like this. I look forward to your contribution :)