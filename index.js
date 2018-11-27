(function () {
    'use strict';
    var _ = require('lodash');

    module.exports = function Signaling(
        principal,
        location,
        rels,
        options,
        lifecycle,
        events_order,
        events,
        transitionEvent,
        domainName,
        userGroup,
        users) {

        var vm = this;
        vm.principal = principal;
        vm.location = location;
        vm.rels = rels;
        vm.options = options;
        vm.lifecycle = lifecycle;
        vm.events_order = events_order;
        vm.events = events;
        vm.transitionEvent = transitionEvent;
        vm.domainName = domainName;
        vm.userGroup = userGroup;
        vm.users = users;

        //methods
        vm.broadcast  = broadcast;
        vm.applyverb = applyverb;
        vm.loadpanel = loadpanel;
        vm.execute = execute;
        vm.load = load;
        vm.settransition = settransition;
        vm.getcase = getcase;
        vm.remap = remap;
        vm.loadcache = loadcache;
        vm.loadoption = loadoption;
        vm.loadrules = loadrules;

        function broadcast(eventName, cb) {
            return new Promise(function (resolve, reject) {
                if (typeof cb === 'function') {
                    var resp = cb(eventName, vm.lifecycle);
                    resolve(resp);
                }else{
                    resolve(true);
                }
            });
        }

        function loadoption(cb) {
            return new Promise(function (resolve, reject) {
                if (typeof cb === 'function') {
                    var resp = cb();
                    if (_.isUndefined(resp) || _.isNull(resp)) {
                        reject("Call Back is undefined on loadoption");
                    }
                    resolve(resp);
                } else {
                    resolve(true);
                }
            });
        }

        function load(cb) {
            return new Promise(function (resolve, reject) {
                if (!_.isEmpty(vm.principal) && _.isEmpty(vm.lifecycle.items.service)) {
                    vm.lifecycle.items.service = vm.principal;
                }
                var links = _.first(vm.lifecycle.items.service) ? _.first(vm.lifecycle.items.service).links : '';
                _.forEach(links, function (value) {
                    if (value.location === vm.location && value.verb === 'GET' && value.type === 'options' && value.group === vm.userGroup) {
                        vm.applyverb(
                            value.href,
                            value.verb,
                            false,
                            null,
                            null,
                            null,
                            null,
                            null,
                            cb
                        ).then(function (results) {
                            if (results && results.data && !_.isEmpty(results.data.items)) {
                                if (_.isEmpty(_.filter(vm.rels, {rel: vm.location}))) {
                                    var data = {options: results.data.items};
                                    _.assign(data, value);
                                    vm.rels.push({rel: value.name, items: data});

                                }
                                resolve(results);
                            }
                        });
                    }
                });
                if (_.isEmpty(links) || links === '') {
                    reject("No object to load()");
                }
            });
        }

        function loadrules(cb) {
            return new Promise(function (resolve, reject) {
                vm.load(cb).then(function () {
                    if (!_.isEmpty(_.filter(vm.rels, {rel: vm.location}))) {
                        _.forEach(_.filter(vm.rels, {rel: vm.location}), function (value) {
                            _.forEach(value.items.options, function (items) {
                                _.forEach(items.rules, function (object) {
                                    if (object.permission && _.isEmpty(_.filter(vm.users, {rel: items.name}))) {
                                        _.forEach(object.permission, function (user) {
                                            user.rel = items.name;
                                            vm.users.push(user);
                                        });
                                    }
                                    if (object.events && _.isEmpty(_.filter(vm.events, {rel: items.name}))) {
                                        var event = {rel: items.name, items: object.events};
                                        vm.events.push(event);
                                    }
                                    if (object.events_order && _.isEmpty(_.filter(vm.events_order, {rel: items.name}))) {
                                        var event_order = {rel: items.name, items: object.events_order};
                                        vm.events_order.push(event_order);
                                    }
                                });
                            });
                            resolve(value);
                        });
                    } else {
                        reject("Could not loadrules - no rels for specified location");
                    }
                });
            });
        }

        function loadcache(rel, cb)
        {
            return new Promise(function(resolve, reject){
                if (typeof cb === 'function') {
                    var resp = cb(vm.lifecycle, rel);
                    if (_.isUndefined(resp)){
                        reject("loadcache not defined");
                    }
                    resolve(resp);
                } else {
                    resolve(true);
                }
            });
        }

        function execute(lifecycle, switchcb, panelcb, broadcastcb, verbcb, cachecb, rulescb)
        {

            if (_.isEmpty(vm.events_order) && _.isEmpty(_.filter(vm.lifecycle.items.events_order, {rel: vm.lifecycle.option}))) {
                vm.loadrules(rulescb).then(function () {
                    vm.execute(lifecycle, switchcb, panelcb, broadcastcb, verbcb, cachecb, rulescb);
                });
            } else {
                if (!_.isEmpty(_.filter(vm.events_order, {rel: vm.lifecycle.option})) && _.isEmpty(_.filter(vm.lifecycle.items.events_order, {rel: vm.lifecycle.option}))) {
                    vm.lifecycle.items.events_order = vm.events_order;
                }
                if (!_.isEmpty(_.filter(vm.events, {rel: vm.lifecycle.option})) && _.isEmpty(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option}))) {
                    vm.lifecycle.items.events = vm.events;
                }
                var event = null;

                if (lifecycle.prevEvent !== '' && lifecycle.postEvent === '' && _.isNull(vm.transitionEvent)) {
                    var itemEvents = _.first(_.filter(lifecycle.items.events_order, {rel: vm.lifecycle.option})).items;
                    var index = _.indexOf(itemEvents, lifecycle.prevEvent);
                    index++;
                    event = itemEvents[index];
                    lifecycle.postEvent = event;
                } else if (_.isNull(vm.transitionEvent)) {
                    var itemEvents_v1 = _.first(_.filter(vm.lifecycle.items.events_order, {rel: vm.lifecycle.option})).items;
                    event = itemEvents_v1[0];
                    vm.lifecycle.postEvent = event;
                }

                var eventObject;
                var switchEvent = !_.isNull(vm.transitionEvent) ? vm.transitionEvent : event;

                switch (_.first(switchEvent ? switchEvent.split('_') : [' '])) {
                    case 'confirmation':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];

                        vm.loadpanel('handle', eventObject.html, eventObject.modal.size, panelcb);

                        break;

                    case 'get':

                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];

                        var href = _.find(_.first(vm.lifecycle.items[eventObject.links]).links, {name: eventObject.rel}).href;
                        var mapping;
                        var getOb;

                        vm.applyverb(eventObject.criteria_mapping ? href + '?' + 'where=' + JSON.stringify(vm.remap(_.first(eventObject.criteria_mapping), _.first(vm.lifecycle.items[eventObject.name]))) : !_.isEmpty(_.map(eventObject.keyvalue, 'where')) ? href + '?' + 'where=' + JSON.stringify(_.first(_.map(eventObject.keyvalue, 'where'))) : href,
                            _.first(switchEvent.split('_')),
                            false,
                            null,
                            null,
                            eventObject.rel,
                            eventObject.name,
                            eventObject.message,
                            verbcb
                        ).then(function (results) {
                            var defer_mapping = new Promise(function (resolve, reject) {
                                if (!_.isEmpty(eventObject.mapping)) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        mapping = mappings;
                                        getOb = _.clone(mapping);
                                        _.map(_.zip(_.keys(mapping), _.values(mapping)), function (pair) {
                                            if (!_.isUndefined(pair[1]) && !_.isNull(pair[1]) && !_.isUndefined(results.data.items) && results.data.items.length > 0) {
                                                getOb[pair[0]] = _.first(results.data.items)[pair[1]];
                                            }
                                            resolve(pair);
                                        });

                                    });
                                } else {
                                    reject("eventObject.mapping is empty");
                                }
                            });

                            defer_mapping.then(function () {
                                var defer_get = new Promise(function (resolve, reject) {
                                    _.map(vm.lifecycle.items[eventObject.name], function (service) {
                                        _.assign(service, getOb);
                                        resolve(service);
                                    });
                                });

                                defer_get.then(function () {
                                    vm.settransition(switchEvent);
                                    vm.broadcast("lifecycle_change", broadcastcb);
                                });
                            });
                        });

                        break;

                    case 'cache':

                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];
                        vm.lifecycle.items[eventObject.name] = [];

                        vm.loadcache(eventObject.rel, cachecb).then(function () {
                            var defer_cache = new Promise(function (resolve, reject) {
                                _.map(vm.lifecycle.items[eventObject.rel], function (serv) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        vm.lifecycle.items[eventObject.name].push(eventObject.keyvalue ? _.assign(vm.remap(mappings, serv), eventObject.keyvalue) : vm.remap(mappings, serv));
                                    });
                                    resolve(serv);
                                });
                            });

                            defer_cache.then(function () {
                                vm.settransition(switchEvent);
                                vm.broadcast("lifecycle_change", broadcastcb);
                            });
                        });
                        break;

                    case 'transform':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_transform = new Promise(function (resolve, reject) {
                            _.map(vm.lifecycle.items[eventObject.name], function (ob) {
                                _.map(eventObject.mapping, function (mappings) {
                                    _.merge(ob, vm.remap(mappings, ob[eventObject.rel]));
                                });
                                resolve(ob);
                            });
                        });

                        defer_transform.then(function () {
                            vm.settransition(switchEvent);
                            vm.broadcast("lifecycle_change", broadcastcb);
                        });
                        break;

                    case 'post':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];

                        var relate = _.find(_.first(vm.lifecycle.items[eventObject.links]).links, {name: eventObject.rel});

                        vm.applyverb(
                            relate.href,
                            relate.verb,
                            false,
                            vm.lifecycle,
                            {
                                'Content-Type': 'application/json'
                            },
                            relate.rel,
                            eventObject.name,
                            eventObject.message,
                            verbcb
                        );

                        break;

                    case 'new':

                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];

                        var href_new = _.find(_.first(vm.lifecycle.items[eventObject.links]).links, {name: eventObject.rel}).href;
                        var arr = [];
                        vm.lifecycle.items[vm.domainName] = [];
                        vm.applyverb(
                            eventObject.criteria_mapping ? href_new + '?' + 'where=' + JSON.stringify(vm.remap(_.first(eventObject.criteria_mapping), _.first(vm.lifecycle.items[eventObject.name]))) : href_new,
                            'get',
                            false,
                            null,
                            null,
                            eventObject.rel,
                            eventObject.name,
                            eventObject.message,
                            verbcb
                        ).then(function (results) {
                            var defer_mapping_new = new Promise(function (resolve, reject) {
                                _.map(results.data.items, function (serv) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        arr.push(eventObject.keyvalue ? _.assign(vm.remap(mappings, serv), eventObject.keyvalue) : vm.remap(mappings, serv));
                                    });
                                    resolve(serv);
                                });
                            });

                            defer_mapping_new.then(function () {

                                var defer_domain = new Promise(function (resolve, reject) {
                                    _.map(arr, function (service) {
                                        vm.lifecycle.items[vm.domainName].push(service);
                                        resolve(service);
                                    });
                                });

                                defer_domain.then(function () {
                                    vm.settransition(switchEvent);
                                    vm.broadcast("lifecycle_change", broadcastcb);
                                });
                            });
                        });
                        break;

                    case 'mergeWhere':

                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];

                        var href_assign = _.find(_.first(vm.lifecycle.items[eventObject.links]).links, {name: eventObject.rel}).href;
                        var arr_assign = [];
                        var ob = {'parameter': _.map(vm.lifecycle.items[eventObject.name], eventObject.keyvalue.where.parameter)};
                        // url, method, cache, data, headers, rel, name
                        vm.applyverb(eventObject.criteria_mapping ? href_assign + '?' + 'where=' + JSON.stringify(vm.remap(_.first(eventObject.criteria_mapping), ob)) : href_assign,
                            'get',
                            false,
                            null,
                            null,
                            eventObject.rel,
                            eventObject.name,
                            eventObject.message,
                            verbcb
                        ).then(function (results) {
                            var defer_mapping_assign = new Promise(function (resolve, reject) {
                                _.map(results.data.items, function (serv) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        arr_assign.push(eventObject.keyvalue ? _.assign(vm.remap(mappings, serv), eventObject.keyvalue) : vm.remap(mappings, serv));
                                    });
                                    resolve(serv);
                                });
                            });


                            var key = eventObject[switchEvent].parameter;
                            var object = {};

                            defer_mapping_assign.then(function () {

                                var defer_domain = new Promise(function (resolve, reject) {
                                    _.map(vm.lifecycle.items[vm.domainName], function (service) {
                                        object[key] = service[key];
                                        _.merge(service, _.first(_.filter(arr_assign, object)));
                                        resolve(service);
                                    });
                                });

                                defer_domain.then(function () {
                                    vm.settransition(switchEvent);
                                    vm.broadcast("lifecycle_change", broadcastcb);
                                });
                            });
                        });
                        break;

                    case 'deleteAttribute':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_delete = new Promise(function (resolve, reject) {
                            _.map(vm.lifecycle.items[eventObject.name], function (domain) {
                                _.map(eventObject.mapping, function (v2) {
                                    _.map(_.keys(v2), function (v3) {
                                        delete domain[v3];
                                    });
                                });
                                resolve(domain);
                            });
                        });

                        defer_delete.then(function () {
                            vm.settransition(switchEvent);
                            vm.broadcast("lifecycle_change", broadcastcb);
                        });
                        break;

                    case 'assign':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_assign = new Promise(function (resolve, reject) {
                            _.map(vm.lifecycle.items[eventObject.name], function (domain) {
                                _.map(eventObject.mapping, function (v) {
                                    _.assign(domain, vm.remap(v, domain));
                                });

                                resolve(domain);
                            });
                        });

                        defer_assign.then(function () {
                            vm.settransition(switchEvent);
                            vm.broadcast("lifecycle_change", broadcastcb);
                        });
                        break;

                    case 'deleteObject':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_deleteObject = new Promise(function (resolve, reject) {
                            var cl = _.clone(vm.lifecycle.items[eventObject.name]);
                            _.map(cl, function (domain) {
                                _.map(eventObject.keyvalue, function (v2) {
                                    _.map(_.keys(v2), function (v3) {
                                        if (domain[v3] === v2[v3]) {
                                            _.remove(lifecycle.items[eventObject.name], domain);

                                        }
                                    });
                                });
                                resolve(domain);
                            });
                        });

                        defer_deleteObject.then(function () {
                            vm.settransition(switchEvent);
                            vm.broadcast("lifecycle_change", broadcastcb);
                        });
                        break;

                    case 'eq':
                        eventObject = _.find(_.first(_.filter(vm.lifecycle.items.events, {rel: vm.lifecycle.option})).items, switchEvent)[switchEvent];

                        var compare = !_.isEmpty(_.filter(vm.lifecycle.items[eventObject.name], _.first(eventObject.criteria)));
                        if (compare) {
                            var defer_if = new Promise(function (resolve, reject) {
                                vm.transitionEvent = eventObject.transitionEvent;
                                resolve(vm.transitionEvent);
                            });
                            defer_if.then(function () {
                                vm.broadcast("transition_change", broadcastcb);
                            });
                        } else {
                            vm.settransition(switchEvent);
                            vm.broadcast("lifecycle_change", broadcastcb);
                        }

                        break;

                    default:
                        switchcb(vm.lifecycle, switchEvent);
                }

            }
        }

        function loadpanel(name, html, size, cb)
        {
            return new Promise(function(resolve, reject){
                var resp = cb(name, vm.lifecycle, html, size);
                resolve(resp);

                if (_.isUndefined(resp)){
                    reject("loadpanel not defined");
                }

            });
        }

        function applyverb(url, method, cache, data, headers, rel, name, message, cb)
        {
            return new Promise(function(resolve, reject){
                var resp = cb(url, method, cache, data, headers, rel, name, message);
                resolve(resp);

                if (_.isUndefined(resp)){
                    reject("applyverb not defined");
                }

            });

        }

        function getcase()
        {

        }

        function remap(mapping, value)
        {
            var newob = _.clone(mapping);
            if (value) {
                _.map(_.zip(_.keys(mapping), _.values(mapping)), function (pair) {

                    newob[pair[0]] = value[pair[1]];

                });
            }
            return newob;
        }

        function settransition(event)
        {
            if (_.last(event.split('$')).toLowerCase() === 'transition') {
                vm.transitionEvent = null;
            }
        }
    }
}());