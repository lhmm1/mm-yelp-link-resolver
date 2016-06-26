mm-yelp-link-resolver
=====================

This is the code for a link resolver Mixmax integration with Yelp. 

The link resolver matches on "yelp.com/biz/..." links within the email.

ex: yelp.com/biz/treat-ice-cream-company-san-jose

From there, it renders a Yelp page and takes a snapshot of the top portion of the page. It serves up a clickable snapshot that will redirects to the Yelp page itself on click. 

Written in JavaScript and uses PhantomJS.

Running the link resolver
-------------------------

1. Ensure that PhantomJS is installed (tested against PhantomJS 1.9.0). To install it in Ubuntu, use:

    sudo apt-get install phantomjs

1. Run the following command from the directory containing capture_yelp.js:

    phantomjs --ssl-protocol=any --web-security=false capture_yelp.js 

License
-------------------------

This project is under the MIT license. See LICENSE for more details.
