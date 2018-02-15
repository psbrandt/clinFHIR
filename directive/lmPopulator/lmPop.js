angular.module('sampleApp')
    .directive('lmPopulator', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                model: '='
            },

            templateUrl: 'directive/lmPopulator/lmPopulator.html',
            controller: function($scope,logicalModelSvc,GetDataFromServer){

                $scope.input = {};
                //react to change of model
                $scope.$watch(function(scope){
                    return scope.model
                },function(){
                    drawTree();
                });


                $scope.sectionInstances = []

                $scope.selectSection = function(section) {
                    $scope.selectedSection = section;       //this is actually the definition
                    console.log(section)

                    //find all the instances of this section.
                    $scope.selectedSectionInstances = [];
                    $scope.sectionInstances.forEach(function (inst) {
                        if (inst.code == section.code ) {
                            $scope.selectedSectionInstances.push(inst)
                        }
                    });
                    switch ($scope.selectedSectionInstances.length) {
                        case 0 :
                            //there are no instances yet. Create one and add to the array
                            var instance = {code:section.code,children:section.children,section: section,values: []}

                            $scope.sectionInstances.push(instance);
                            $scope.selectedInstance = instance;
                            break;
                        case 1 :
                            //there's a single instance, select it by default
                            $scope.selectedInstance = $scope.selectedSectionInstances[0]
                            break;
                        default :
                            //there's more than one instance.
                            break

                    }


console.log($scope.selectedInstance)

                    //$scope.selectedSection = section.children;
                };

                $scope.addValue = function(child,value,isMultiple){
                    child.values = child.values || []
                    if (isMultiple) {
                        child.values.push({value:value,field:child.text})

                    } else {
                        child.values[0] = {value:value,field:child.text}
                    }

                    makeDocument($scope.sections,$scope.sectionInstances)

                    return;


                    var value = $scope.input.value;
                    delete $scope.input.value;
                    var path = $scope.selectedNode.id;
                    $scope.values[path] = {value:value};
                };


                //functions and prperties to enable the valueset viewer
                $scope.showVSBrowserDialog = {};
                $scope.showVSBrowser = function(vs) {
                    $scope.showVSBrowserDialog.open(vs);        //the open method defined in the directive...
                };
                $scope.viewVS = function(uri) {

                    $scope.waiting = true;
                    GetDataFromServer.getValueSet(uri).then(
                        function(vs) {
                            $scope.showVSBrowserDialog.open(vs);

                        }, function(err) {
                            alert(err)
                        }
                    ).finally (function(){
                        $scope.waiting = false;
                    });
                };

                var makeDocument = function(sections,instances) {
                    $scope.document = {sections:[]};
                    sections.forEach(function (section) {
                        //are there any instances of this section
                        instances.forEach(function (inst) {
                            if (inst.code == section.code) {
                                //yes (at least one)
                                var docSection = {code:inst.code,values:[]}
                                $scope.document.sections.push(docSection);
                                //now pull out all the values from the instance, where there is data in them...
                                inst.children.forEach(function (child) {
                                    if (child.values && child.values.length > 0) {

                                        //docSection.values = []
                                        child.values.forEach(function (v) {
                                            if (v.value) {
                                                docSection.values.push(v)
                                            }
                                        })

                                        //docSection.values.push(child.values)
                                    }
                                })
                            }
                        })
                        
                    })
                };
                
                function drawTree() {
                    $scope.values = {};        //a hash that contains values entered by the user
                    var treeData = logicalModelSvc.createTreeArrayFromSD($scope.model);

                    $scope.allNodes = [];  //an ordered list of all paths
                    $scope.sections = [];   //the sections (top level elements) in the model
                    var topNode = treeData[0];      //the parent node for the mpdel
                    var section;

                    var singleTopNodeSection = {code:'top',title:'top',node:{},children:[]};
                    $scope.sections.push(singleTopNodeSection);

                    treeData.forEach(function (node) {
                        if (node.parent == topNode.id) {
                            //this is directly off the parent...

                            var type ='unknown';
                            try {
                                type = node.data.ed.type[0].code

                            } catch (ex){}//shouldn't happen...




                            if (type == 'BackboneElement' || type == 'Reference') {
                                //this has child nodes
                                //this is a new section.
                                section = {code:node.id,title:node.text,node:node,children:[]};
                                $scope.sections.push(section);
                            } else {
                                //this is a single element off the root..
                                singleTopNodeSection.children.push(node);
                            }



                           // nestedChildIds = {};
                           // nestedChildIds[node.id] = 'x';  //any nodes that have this as a parent will be inclded. This will 'flatten' the tree
                        } else {
                            if (section) {
                                //does this node (itself a child) allow multiple values



                                if (node.data.max == '*') {
                                    node.multiple = true;
                                }
                                var cloneNode = angular.copy(node);
                                cloneNode.vs = node.data.selectedValueSet

                                delete cloneNode.data;

                                section.children.push(cloneNode);
                                console.log(cloneNode)
                            }
                        }

                        $scope.allNodes.push(node)
                    });

                    $('#popTree').jstree('destroy');
                    $('#popTree').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        //seems to be the node selection event...

                        if (data.node) {
                            $scope.selectedNode = data.node;
                            console.log($scope.selectedNode)
                            //$scope.input.value = $scope.values[path];

                        }

                        $scope.$digest();       //as the event occurred outside of angular...

                    }).on('redraw.jstree', function (e, data) {

                        //ensure the selected node remains so after a redraw...
                        if ($scope.treeIdToSelect) {
                            //  $("#lmTreeView").jstree("select_node", "#"+$scope.treeIdToSelect);
                            delete $scope.treeIdToSelect
                        }

                    });
                }




            }
        }
    });