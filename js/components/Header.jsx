'use strict';

var React = require('react'),
    Router = require('react-router'),
    Link = Router.Link,
    Header;

Header = React.createClass({
    render: function() {
        return (
            <header id="header" className="container-fluid">
                <Link to="home" >
                    <div className="row">
                        <div className="container">
                            <div className="row">
                                <h2>
                                    How Fucked is the &#9417;?
                                </h2>
                            </div>
                        </div>
                    </div>
                </Link>
            </header>
        );
    }
});

module.exports = Header;
