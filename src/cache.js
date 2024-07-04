const logger = require('./logger');
// LRUCache class that implements a Least Recently Used (LRU) cache
// key: name of the domain
// value: {data, TTL, savedAt}
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();  // This map holds the key and value pairs
        this.head = null;
        this.tail = null;
    }

    // Get the value of the key if the key exists in the cache, otherwise return -1.
    get(key) {
        if (!this.map.has(key)) {
            return NaN;
        }

        const { value } = this.map.get(key);
        // Check if the TTL has expired
        // console.log(Math.floor(Date.now() / 1000));
        if (value.TTL < Math.floor(Date.now() / 1000) - value.savedAt) {
            this.remove(key);
            return NaN;
        }
        // Move to the front of the list to mark as most recently used
        this.remove(key);
        this.add(key, value);
        return value;
    }

    // Put key-value pair into the cache.
    // If the key already exists, update the value and move it to the front.
    // If the key doesn't exist, add the key-value pair to the front and ensure capacity.
    put(key, value) {
        if (this.map.has(key)) {
            this.remove(key);
        }
        this.add(key, value);
        if (this.map.size > this.capacity) {
            // Remove the least recently used item
            this.remove(this.tail.key);
        }
    }

    // Remove node from the linked list and map
    remove(key) {
        const node = this.map.get(key);
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
        this.map.delete(key);
    }

    // Add node to the front of the linked list and map
    add(key, value) {
        const node = { key, value, next: this.head, prev: null };
        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
        this.map.set(key, node);
    }

    caching(received) {
        if (received.answers.length > 0) {
            if (received.questions[0].type == 1 || received.questions[0].type == 28) {
                const key = received.questions[0].name;
                let answers = [];
                let minTTL = received.answers[0].ttl;
                for (let i = 0; i < received.answers.length; i++) {
                    if (received.answers[i].ttl < minTTL) {
                        minTTL = received.answers[i].ttl;
                    }
                    answers.push({
                        name: received.questions[0].name,
                        type: received.answers[i].type,
                        class: received.answers[i].class,
                        ttl: received.answers[i].ttl,
                        data: received.answers[i].data
                    });
                }
                let data = {
                    "type": received.answers[0].type,
                    "TTL": minTTL,
                    "savedAt": Math.floor(Date.now() / 1000),
                    "answers": answers
                }
                this.put(key, data);
                logger.info(`Cache added: ${key}`);
            }
        }
    }   
}
// // Usages
// const cache = new LRUCache(2);
// cache.put(1, {"ip": "0.0.0.0", "type": "A", "TTL": 3});  // cache is {1=1}
// cache.put(2, 2);  // cache is {1=1, 2=2}
// console.log(cache.get(1));       // returns 1
// cache.put(3, 3);  // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
// console.log(cache.get(2));       // returns -1 (not found)
// cache.put(4, 4);  // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
// console.log(cache.get(1));       // returns -1 (not found)
// console.log(cache.get(3));       // returns 3
// console.log(cache.get(4));       // returns 4

module.exports = LRUCache;