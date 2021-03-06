'use strict';

var React = require('react'),
    Router = require('react-router'),
    Immutable = require('immutable'),
    AppConstants = require('../AppConstants'),
    ActionCreators = require('../ActionCreators'),
    TrainStore = require('../stores/TrainStore'),
    LineStore = require('../stores/LineStore'),
    LineResources = require('../stores/LineResources'),
    Line;

function getState() {
    // Maybe only grab the colour?
    return {
        lines: LineStore.getLines(),
        trains: TrainStore.getTrainLines(),
        trainsAtStations: TrainStore.getTrainsAtStations()
    };
}

var LineSVG = React.createClass({
        render: function() {
            return (<svg {...this.props}>{this.props.children}</svg>);
        }
});


var Station = React.createClass({
    render: function() {
        var radius = 25;

        return (
                <g>
                <title>[time here]</title>
                    <circle
                        onClick={function(e) {console.log('yo');}}
                        cx={this.props.x}
                        cy={this.props.y}
                        r={radius}> station </circle>
                    <text x={this.props.x + (radius/2)+15}
                          y={this.props.y + (radius/2)}>{this.props.name}</text>
                </g>
                );
    }
});

var TrainLine = React.createClass({
    render: function() {
        return( <line {...this.props} strokeWidth="20" stroke={this.props.colour} />)
    }
});

var Train = React.createClass({
    northbound: function(x,y) {
        return x+","+y+" "+(x-20)+","+(y+40)+" "+(x+20)+","+(y+40);
    },

    southbound: function(x,y) {
        return x+","+y+" "+(x-20)+","+(y-40)+" "+(x+20)+","+(y-40);
    },

    render: function() {
        var x = parseInt(this.props.x);
        var y = parseInt(this.props.y);
        var direction = this.props.dir;
        if (direction == 'Westbound' || direction == 'Northbound') {
            var points = this.northbound(x,y);
        } else {
            var points = this.southbound(x,y);
        }
        return(<polygon points={points}></polygon>)
    }
});


var StationTree = React.createClass({
    render: function() {
        var { station, ...other } = this.props;
        var trainsAtStations = this.props.trainsAtStations;
        var centerPoint = this.props.width / 2;
        var xscale = this.props.xscale;
        var yscale = this.props.yscale;
        var name = this.props.station.get('name');

        var children = this.props.station.get('next_stations');
        var x = centerPoint + (xscale * parseInt(station.get('x')));
        var y = yscale * parseInt(station.get('y'));

        var nextStations = children.map(nextStation => <StationTree station={nextStation} {...other} />);

        var trainLines = children.map(nextStation =>
                <TrainLine x1={x} y1={y}
                    x2={centerPoint + (this.props.xscale * parseInt(nextStation.get('x')))}
                    y2={parseInt(nextStation.get('y')) * this.props.yscale}
                    colour={this.props.colour} />);

        var trains = Immutable.Map();
        var station = trainsAtStations.get(name);
        if (station) {
            trains = station.map(function(train, offset) {
                offset = offset + 1;
                var station = this.props.station;
                var xscale = this.props.xscale;
                var yscale = this.props.yscale;
                var x = centerPoint + (xscale * parseInt(station.get('x'))) - (offset * 50);
                var y = yscale * parseInt(station.get('y'));
                return (<Train x={x} y={y} dir={train.get('direction')}/>);
            }, this);
        }

        return (<g>
                    <g>
                        {trainLines.toJS()}
                        {trains.toJS()}
                        {nextStations.toJS()}
                    </g>

                    <Station x={x} y={y} name={name}/>
                </g>
               );
    }
});


var LineInfo = React.createClass({
    render: function() {
        var directions = this.props.line.get('directions');
        var cols = 12;
        var directionColumns = null;
        if (directions && directions.size > 0) {
            cols = Math.floor(12 / directions.size);
            directionColumns = directions.map(function(deets, direction) {
                return (
                    <div key={direction} className={"col-sm-" + cols}>
                        <h3>{direction}</h3>
                        <p>
                            {deets.get('fuckedness')}
                            <br/>
                            Avg wait {deets.get('wait')}
                            <br/>
                            {deets.get('trains')} active trains
                        </p>
                    </div>
                );
            }).toJS();
        }

        return (
            <div className={"row line-" + this.props.colour}>
                <div className="container line-directions">
                    <div className="row">
                        {directionColumns}
                    </div>
                </div>
            </div>
        )
    }
});

Line = React.createClass({
    mixins: [ Router.State ],

    getInitialState: function() {
        return getState();
    },

    componentDidMount: function() {
        LineStore.on(AppConstants.CHANGE_EVENT, this._onChange);
    },

    componentWillUnmount: function() {
        LineStore.removeListener(AppConstants.CHANGE_EVENT, this._onChange);
    },

    _onChange: function() {
        this.setState(getState());
    },

    /**
     * @param {Immutable Map} station
     * @param {Number} size
     * @return {Number}
     */
    treeSize: function(station, size) {
        if (station === undefined) { return size; }
        var children = station.get('next_stations');
        if (children && children.size > 0) {
            return children.map(function(branch) {
                return this.treeSize(branch, size + 1);
            }, this).max();
        } else {
            return size;
        }
    },

    treeWidth: function(station, size) {
        var children = station.get('next_stations');
        if (children && children.size > 0) {
            // folding in JS is weird :/
            var count = 0;
            children.map(function(branch) {
                count = count + this.treeWidth(branch, size);
            }, this);
            return count;
        } else {
            return size + 1;
        }
    },

    render: function() {
        var stations = LineResources.getStations(this.getParams().colour);
        var colour = stations.get('colour');
        var station = stations.get('root');

        var width = window.innerWidth - 40;
        var height = this.treeSize(station, 1) * 105;

        var branches = this.treeWidth(station, 0);

        var yscale = 100;
        var xscale = width / (branches + 2);

        return (
                <div>
                    <LineInfo line={this.state.lines.get(this.getParams().colour) || Immutable.Map()} colour={colour} />
                    <div>
                        <LineSVG height={height} width={width}>
                            <StationTree
                                width={width}
                                height={height}
                                xscale={xscale}
                                yscale={yscale}
                                trainsAtStations={this.state.trainsAtStations}
                                station={station} colour={colour} />
                        </LineSVG>
                    </div>
                </div>);
    }
});

module.exports = Line;
