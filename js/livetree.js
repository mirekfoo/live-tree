var liveTrees = [];

var live_tree_id_gen = 0;

// classes for list annotation by live-tree
var live_tree_node_class_name = "live-tree-node";
var live_tree_level_class_prefix = "live-tree-level-";
var live_tree_node_group_ctrl_class_name = "live-tree-node-group-ctrl";
var live_tree_node_group_ctrl_expanded_class_name = "live-tree-node-group-ctrl-expanded"; // toggled
var live_tree_group_nested_items_class_name = "live-tree-group-nested-items";
var live_tree_group_expanded_class_name = "live-tree-group-expanded"; // toggled

// classes for list annotation by user
var live_list_tree_class_name = "live-list-tree";
var live_tree_container_class_name = "live-tree-container";

//////////////// html list navigation /////////////////

function is_list_node_item(live_list_item) {
    switch (live_list_item.prop("tagName")) {
        case "LI":
        case "DD":
            return true;
    }
    return false;
}

function is_list_group_item(live_list_item) {
    switch (live_list_item.prop("tagName")) {
        case "UL":
        case "OL":
        case "DL":
            return true;
    }
    return false;
}

function listNodeItemTag(element) {
    switch (element.tagName) {
        case "LI":
        case "UL":
        case "OL":
            return "LI";
        case "DD":
        case "DL":
            return "DD";
    }
    return "";
}

//////////////// live-tree navigation /////////////////

function findParentByTag(element, tag) {
    while (element.tagName != tag.toUpperCase()) {
        element = element.parentElement;
    }
    return element;
}

function findListNestedElement(element) {
    var li_item = findParentByTag(element, listNodeItemTag(element));
    var nested_item = li_item.querySelector("." + live_tree_group_nested_items_class_name); // try children
    if (!nested_item) {
        nested_item = li_item.nextElementSibling;
    }
    console.assert(nested_item && nested_item.classList.contains(live_tree_group_nested_items_class_name));
    return nested_item;
}

function findLiveTreeContainer(element) {
    while (!element.classList.contains(live_tree_container_class_name)) {
        element = element.parentElement;
    }

    return element;
}

function getLiveTree(live_tree_container) {
    var live_tree_container_id = live_tree_container.id;
    var tree = liveTrees[live_tree_container_id];
    return tree;
}

function findLiveTree(element) {
    return getLiveTree(findLiveTreeContainer(element));
}

//////////////// live-tree runtime /////////////////

// unregister all nodes to allow update their positions
function unregister_live_tree_nodes(tree, nodes) {
    // nodes - string list
    nodes.forEach(function (node_i) {
        if ((typeof node_i) == "string") {
            tree.instance.unmanage(node_i);
        } else {
            unregister_live_tree_nodes(tree, node_i);
        }
    });    
}

function live_tree_onclick_action(ev) {

    var nested_item = findListNestedElement(this);
    console.assert(nested_item);
    nested_item.classList.toggle(live_tree_group_expanded_class_name);

    console.assert(this.classList.contains(live_tree_node_group_ctrl_class_name));
    this.classList.toggle(live_tree_node_group_ctrl_expanded_class_name); // toggle expand/collapse the group

    ev.stopPropagation();

    var tree = findLiveTree(this);
    // re-construct live tree again
    tree.instance.selectEndpoints().delete();
    unregister_live_tree_nodes(tree,tree.nodes);
    reconnect_live_list_tree(tree);
}

//////////////// live-tree setup /////////////////

function get_live_tree_element_uuid(element) {
    // add id if not (if not set already)
    var id = element.attr("id");
    if ((!id) || id == "") {
        id = "live-tree-item-" + (live_tree_id_gen++);
        element.attr("id", id);
    }

    // return item id
    return id;
}

function make_live_list_node(live_list_item, level) {
    // set live-tree-node class (if not set already)
    live_list_item.addClass(live_tree_node_class_name);
    live_list_item.addClass(live_tree_level_class_prefix + level);
    return get_live_tree_element_uuid(live_list_item);
}

function make_live_list_nodes(live_list_tree, level) {

    var live_list = [];
    var live_list_tree_items = live_list_tree.children();

    live_list_tree_items.each(function () {
        var live_list_item = $(this);
        if (is_list_node_item(live_list_item)) {
            live_list.push(make_live_list_node(live_list_item, level));
        } else if (is_list_group_item(live_list_item)) {
            live_list_item.addClass(live_tree_group_nested_items_class_name); // mark group node
            live_list.push(make_live_list_nodes(live_list_item, level + 1));
        }

    });
    return live_list;

}

function jsplumb_item_anchor_id_suffux(anchor) {
    return "-" + anchor.toLowerCase();
}

function make_jsplumb_item_endpoints(tree, nodes_selector, anchor) {
    // add endpoints, giving them a UUID.
    // you DO NOT NEED to use this method. You can use your library's selector method.
    // the jsPlumb demos use it so that the code can be shared between all three libraries.
    var nodes = jsPlumb.getSelector(nodes_selector);
    for (var i = 0; i < nodes.length; i++) {
        tree.instance.addEndpoint(nodes[i], {
            uuid: nodes[i].getAttribute("id") + jsplumb_item_anchor_id_suffux(anchor),
            anchor: anchor,
            maxConnections: -1
        });
    }

    return nodes;
}

function make_jsplumb_connection(tree, pair) {
    tree.instance.connect({
        uuids: [pair[0] + jsplumb_item_anchor_id_suffux(tree.anchors[0]), pair[1] + jsplumb_item_anchor_id_suffux(tree.anchors[1])],
        overlays: tree.overlays
    });
}

// add live-tree item(s) attribs (classes, actions) only, no connections
function add_live_tree_item_attribs(tree, parent_item, live_items) {
    // parent_item = string (parent item id)
    // live_items = string list (item ids)

    var parent_item_el = $("#" + parent_item);
    parent_item_el.addClass(live_tree_node_group_ctrl_class_name); // mark group ctrl item
    parent_item_el.click(live_tree_onclick_action); // register group ctrl item onclick action

    var prev_item;
    live_items.forEach(function (live_item) {
        if ((typeof live_item) == "string") {
            prev_item = live_item;
        } else {
            add_live_tree_item_attribs(tree, prev_item, live_item);
        }
    });
}

// add live-tree item(s) attribs (classes, actions) only, no connections
function add_live_tree_attribs(tree, live_tree) {
    var prev_item;
    live_tree.forEach(function (live_item) {
        if ((typeof live_item) == "string") {
            prev_item = live_item;
        } else {
            add_live_tree_item_attribs(tree, prev_item, live_item);
        }
    });
}

function make_live_tree_connects(tree, parent_item, live_items) {
    // parent_item = string (parent item id)
    // live_items = string list (item ids)

    var parent_item_el = $("#" + parent_item);
    //parent_item_el.addClass(live_tree_node_group_ctrl_class_name); // mark group ctrl item
    //parent_item_el.click(live_tree_onclick_action); // register group ctrl item onclick action

    // set start anchor for parent_item
    make_jsplumb_item_endpoints(tree, "#" + parent_item, tree.anchors[0]);
//--/*
    var list_group_item = $(findListNestedElement(parent_item_el.get(0)));
    /*//--*/if (list_group_item.hasClass(live_tree_group_expanded_class_name)) { // connect only visible (expanded) items

        var prev_item;
        live_items.forEach(function (live_item) {
            if ((typeof live_item) == "string") {
                prev_item = live_item;
                // set end anchor for sub_item
                make_jsplumb_item_endpoints(tree, "#" + live_item, tree.anchors[1]);
                // make connection
                make_jsplumb_connection(tree, [parent_item, live_item]);
            } else {
                make_live_tree_connects(tree, prev_item, live_item);
            }
        });
    /*//--*/}
//--*/    
}

function connect_live_tree(tree, live_tree) {
    var prev_item;
    live_tree.forEach(function (live_item) {
        if ((typeof live_item) == "string") {
            prev_item = live_item;
        } else {
            make_live_tree_connects(tree, prev_item, live_item);
        }
    });
}

function make_live_list_tree(tree, live_list_tree_top) {

    var live_tree_nodes = make_live_list_nodes(live_list_tree_top, 0);
    tree.nodes.push(live_tree_nodes);
    add_live_tree_attribs(tree, live_tree_nodes);
    
    connect_live_tree(tree, live_tree_nodes);
}

function reconnect_live_list_tree(tree) {

    tree.nodes.forEach(function (live_tree_nodes) {
        connect_live_tree(tree, live_tree_nodes);
    });
        
}

function get_jsplumb_instance(container) {
    var color = "gray";

    var instance = jsPlumb.getInstance({
        // notice the 'curviness' argument to this Bezier curve.  the curves on this page are far smoother
        // than the curves on the first demo, which use the default curviness value.
        Connector:

            ["Bezier", {
                curviness: 50
        }]

            /*        
                        ["StateMachine", {
                        curviness: 10
                    }]
            */
            /*        
                        ["Flowchart", {
                    }]
            */
            ,
        DragOptions: {
            cursor: "pointer",
            zIndex: 2000
        },
        PaintStyle: {
            stroke: color,
            strokeWidth: 2
        },
        EndpointStyle: {
            radius: /*9*/ 4,
            fill: color
        },
        HoverPaintStyle: {
            stroke: "#ec9f2e"
        },
        EndpointHoverStyle: {
            fill: "#ec9f2e"
        },
        Container: get_live_tree_element_uuid(container)
    });

    return instance;
}

// construct/reconstruct live-tree(s)
function make_live_trees(tree) {

    tree.instance.batch(function () {
        var live_list_trees = /*live_tree_container*/ tree.container.find("." + live_list_tree_class_name);
        live_list_trees.each(function () {
            make_live_list_tree(tree, $(this));
        });

    });
}

function init_live_trees(live_tree_container) {
    // declare some common values:
    var color = "gray";
    var arrowCommon = {
            foldback: 0.7,
            fill: color,
            width: 14
        },
        // use three-arg spec to create two different arrows with the common values:
        overlays = [
                ["Arrow", {
                location: 0.9
                }, arrowCommon]
                /*,
                [ "Arrow", { location: 0.3, direction: -1 }, arrowCommon ]
                */
            ];
    /*
    var level_indent = {
        indent: 1,
        unit: "em"
    };
    */
    var tree = {
        container: /*$(this)*/ live_tree_container,
        instance: get_jsplumb_instance( /*$(this)*/ live_tree_container),
        anchors: ["Right", "Left"],
        overlays: overlays,
        nodes: []
        /*
        ,level_indent: level_indent
        */
    };

    make_live_trees(tree);

    jsPlumb.fire("live-list-tree-demo", tree.instance);
    liveTrees[get_live_tree_element_uuid(tree.container)] = tree; // register the live-tree
}

//$(function(){
jsPlumb.ready(function () {

    var live_tree_containers = $("." + live_tree_container_class_name);
    live_tree_containers.each(function () {
        init_live_trees($(this))
    });

});
