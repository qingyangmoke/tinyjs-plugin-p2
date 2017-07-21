/**
*
* A PointProxy is an internal class that allows for direct getter/setter style property access to Arrays and TypedArrays.
*
* @class PointProxy
* @constructor
* @memberof Tiny.Physics.P2
*/
class PointProxy {
  /**
  * @constructor
  * @param {Tiny.Physics.P2.World} world - world reference to the currently running world.
  * @param {any} destination - The object to bind to.
  */
  constructor(world, destination) {
    this.world = world;
    this.destination = destination;
  }

  /**
  * @name Tiny.Physics.P2.PointProxy#x
  * @property {number} x - The x property of this PointProxy get and set in pixels.
  */
  get x() {
    return this.world.mpx(this.destination[0]);
  }
  set x(value) {
    this.destination[0] = this.world.pxm(value);
  }

  /**
  * @name Tiny.Physics.P2.PointProxy#y
  * @property {number} y - The y property of this PointProxy get and set in pixels.
  */
  get y() {
    return this.world.mpx(this.destination[1]);
  }
  set y(value) {
    this.destination[1] = this.world.pxm(value);
  }

  /**
  * @name Tiny.Physics.P2.PointProxy#mx
  * @property {number} mx - The x property of this PointProxy get and set in meters.
  */
  get mx() {
    return this.destination[0];
  }
  set mx(value) {
    this.destination[0] = value;
  }

  /**
  * @name Tiny.Physics.P2.PointProxy#my
  * @property {number} my - The x property of this PointProxy get and set in meters.
  */
  get my() {
    return this.destination[1];
  }
  set my(value) {
    this.destination[1] = value;
  }
}

export default PointProxy;
