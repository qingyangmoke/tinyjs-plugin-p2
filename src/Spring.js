const p2 = require('../libs/p2');
/**
* Creates a linear spring, connecting two bodies. A spring can have a resting length, a stiffness and damping.
*
* @class Spring
* @constructor
* @memberof Tiny.Physics.P2
* @see p2.LinearSpring
*/
class Spring {
  /**
  * @constructor
  * @param {Tiny.Physics.P2.World} world - world reference to the currently running world.
  * @param {p2.Body} bodyA - First connected body.
  * @param {p2.Body} bodyB - Second connected body.
  * @param {number} [restLength=1] - Rest length of the spring. A number > 0.
  * @param {number} [stiffness=100] - Stiffness of the spring. A number >= 0.
  * @param {number} [damping=1] - Damping of the spring. A number >= 0.
  * @param {Array} [worldA] - Where to hook the spring to body A in world coordinates. This value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {Array} [worldB] - Where to hook the spring to body B in world coordinates. This value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {Array} [localA] - Where to hook the spring to body A in local body coordinates. This value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {Array} [localB] - Where to hook the spring to body B in local body coordinates. This value is an array with 2 elements matching x and y, i.e: [32, 32].
  */
  constructor(world, bodyA, bodyB, restLength = 1, stiffness = 100, damping = 1, worldA, worldB, localA, localB) {
    restLength = world.pxm(restLength);

    /**
    * @name Tiny.Physics.P2.Spring#app
    * @property {Tiny.Application} app - Local reference to app.
    */
    this.app = world.app;

    /**
    * @name Tiny.Physics.P2.Spring#world
    * @property {Tiny.Physics.P2.World} world - Local reference to P2 World.
    */
    this.world = world;

    const options = {
      restLength,
      stiffness,
      damping,
    };

    if (typeof worldA !== 'undefined' && worldA !== null) {
      options.worldAnchorA = [world.pxm(worldA[0]), world.pxm(worldA[1])];
    }

    if (typeof worldB !== 'undefined' && worldB !== null) {
      options.worldAnchorB = [world.pxm(worldB[0]), world.pxm(worldB[1])];
    }

    if (typeof localA !== 'undefined' && localA !== null) {
      options.localAnchorA = [world.pxm(localA[0]), world.pxm(localA[1])];
    }

    if (typeof localB !== 'undefined' && localB !== null) {
      options.localAnchorB = [world.pxm(localB[0]), world.pxm(localB[1])];
    }

    /**
    * @name Tiny.Physics.P2.Spring#data
    * @property {p2.LinearSpring} data - The actual p2 spring object.
    */
    this.data = new p2.LinearSpring(bodyA, bodyB, options);

    this.data.parent = this;
  }
}

export default Spring;
