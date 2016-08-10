angular.module("sampleApp").controller('consultbuilderCtrl',
    function ($scope,$http,GetDataFromServer,modalService,appConfigSvc) {


        var config = appConfigSvc.config();
        var serverBase = config.servers.data;       //the url of the data server


        $scope.allNotes = [];   //all notes - actually (at the moment) Basic resources

        $scope.resources = [];      //list of all possible resourcs
        $scope.consult = {};        //the actual consultation


        $scope.input = {};
        //$scope.input.active = '1'

        $http.get('artifacts/consultBuilderConfig.json').then(
            function(data) {
                //console.log(data);
                $scope.resources = data.data.config.resources;
                $scope.noteType = data.data.config.noteType;
                $scope.input.noteType = $scope.noteType[0];         //default to the first in the list
                
                var template = data.data.config.templates[0];
                console.log(template)

                $scope.consult = {};
                $scope.template = {};

                template.sections.forEach(function(section){
                    $scope.consult[section.code] = {content:[]};    //$scope.consult.s = {content:[]};
                    $scope.template[section.code] = {display:section.display};  // $scope.template.s = {display:'Subjective'};
                })

            }
        );

        $scope.input.soapModel = 's';



        function load() {
            var url = serverBase + "Basic?code=http://clinfhir.com/fhir/NamingSystem/cf|note";      //todo add patient
            $http.get(url).then(
                function(data) {
                    //console.log(data);
                    $scope.allNotes = data.data;    //this is a bundle of Basic resources

                }
            );
        }
        load();
        
        //extract the actual note from the Basic resource
        //being lazy extracting the extensions - should really look at the url...
        $scope.showNote = function(basic) {
            var note = atob(basic.extension[0].valueString);
            $scope.historicNote = angular.fromJson(note);
            
        };

        $scope.editNote = function(){
            $scope.input.active = "1";

        };


        //save the note. Right now, we're saving is as a basic resource. Need to think about how to save real resources...
        $scope.save = function () {
            var basic = {resourceType:'Basic'}
            basic.code = {coding : [{system:'http://clinfhir.com/fhir/NamingSystem/cf',code:'note'}],text:'cfClinicalNote'};
            basic.created = moment().format();

            //this is not the correct usage for identifier - but it's convenient for now...
            basic.identifier = [];
            basic.identifier.push({system:'http://clinfhir.com/fhir/NamingSystem/cfNoteType',value:'progNote'})
            basic.extension = [];

            var extension = {url:'http://clinfhir.com/fhir/StructureDefinition/clinicalNote'};
            var json = angular.toJson($scope.consult);
            extension.valueString = btoa(json);
            basic.extension.push(extension);

            var extensionTempl = {url:'http://clinfhir.com/fhir/StructureDefinition/clinicalTemplate'};
            var jsonTempl = angular.toJson($scope.consult);
            extensionTempl.valueString = btoa(jsonTempl);
            basic.extension.push(extensionTempl);

            //the type of note
            basic.extension.push({url:"http://clinfhir.com/fhir/StructureDefinition/clinicalNoteType",valueCoding:$scope.input.noteType});
         

            $scope.showWaiting = true;
            $http.post(serverBase+'Basic',basic).then(
                function(data) {
                    alert('saved')
                },function(err) {
                    alert(angular.toJson(err));
                }
            ).finally(
                function () {
                    $scope.showWaiting = false;
                }
            )

        };
        
        //select a new resource to add to the note
        $scope.newResource = function(resource) {
            $scope.addNewResource = resource; 
        };

        //add the resource to the note
        $scope.addResource = function(resource) {
            var newResource = angular.copy($scope.addNewResource)
            newResource.text = $scope.input.text;
            
            $scope.consult[$scope.input.soapModel].content.push(newResource);

            delete $scope.input.text;
            delete $scope.addNewResource;

            console.log($scope.consult)
            $scope.dirty=true;
        };

        //when a resource is selected in the actual consult note
        $scope.showResource = function(resource,key,index) {
            //console.log(key,index);
            $scope.displayResource = resource;
            $scope.keyToRemove = key;
            $scope.indexToRemove = index;


        };

        //remove the current resource
        $scope.removeResource = function() {
            var config = {bodyText:'Are you sure you want to remove the ' + $scope.displayResource.type + " resource?"};

            var modalOptions = {
                closeButtonText: "No, I've changed my mind",
                actionButtonText: 'Yes, remove it',
                headerText: 'Remve resource',
                bodyText: 'Are you sure you want to remove the ' + $scope.displayResource.type + " resource?"
            };

            modalService.showModal({}, modalOptions).then(
                function(){
                    $scope.consult[$scope.keyToRemove].content.splice($scope.indexToRemove,1)
                }
            )
        };

        //=========================== code below not currently used  =================

        //when the user wants to add specific elements to a resource
        $scope.addNewElement = function(inp) {
            $scope.newElement = inp;
            console.log(inp)

            $scope.vsDetails = {id:"condition-code","minLength":3}


        };

        $scope.vsLookup = function(text,vs) {

            console.log(text,vs)
            if (vs) {
                $scope.showWaiting = true;
                return GetDataFromServer.getFilteredValueSet(vs,text).then(
                    function(data,statusCode){
                        if (data.expansion && data.expansion.contains) {
                            var lst = data.expansion.contains;
                            return lst;
                        } else {
                            return [
                                {'display': 'No expansion'}
                            ];
                        }
                    }, function(vo){
                        var statusCode = vo.statusCode;
                        var msg = vo.error;


                        alert(msg);

                        return [
                            {'display': ""}
                        ];
                    }
                ).finally(function(){
                    $scope.showWaiting = false;
                });

            } else {
                return [{'display':'Select the ValueSet to query against'}];
            }
        };
        
        
});