import { default as Body } from './body';
import { default as Group } from './Group';
import { default as CollisionGroup } from './CollisionGroup';
import { default as InversePointProxy } from './InversePointProxy';
import { default as Spring } from './Spring';
import { default as RotationalSpring } from './RotationalSpring';
import { default as LockConstraint } from './LockConstraint';
import { default as DistanceConstraint } from './DistanceConstraint';
import { default as GearConstraint } from './GearConstraint';
import { default as RevoluteConstraint } from './RevoluteConstraint';
import { default as PrismaticConstraint } from './PrismaticConstraint';
import { default as Material } from './Material';
import { default as ContactMaterial } from './ContactMaterial';

import * as EVENTS from './EVENTS';

const BODY_TYPE = 'Tiny.Physics.P2.Body';
const p2 = require('../libs/p2');
/**
 * P2 physics world
 *
 * @constructor
 * @memberof Tiny.Physics.P2
 * @extends Tiny.EventEmitter
 */
class World extends Tiny.EventEmitter {
  /**
  * @constructor
  * @param {Tiny.Application} app - app reference to the currently running tiny application.
  * @param {object} config
  */
  constructor(app, config) {
    super();
    this.type = 'Tiny.Physics.P2.World';

    if (config === undefined) {
      config = {
        gravity: [0, 0],
        broadphase: new p2.SAPBroadphase(),
      };
    } else {
      if (!config.hasOwnProperty('gravity')) {
        config.gravity = [0, 0];
      } else {
        // 需要做一次系统的转换
        config.gravity[0] = -config.gravity[0];
        config.gravity[1] = -config.gravity[1];
      }
      if (!config.hasOwnProperty('broadphase')) {
        config.broadphase = new p2.SAPBroadphase();
      }
    }

    /**
    * @property {Tiny.Application} app - Tiny.Application实例
    * @public
    */
    this.app = app;

    /**
    * 给Tiny.Application 增加了一个physics命名空间 所有的物理系统都放到这个命名空间下
    */
    this.app.physics = this.app.physics || {};

    /**
     * 注入到app 物理引擎命名空间下
     */
    this.app.physics.p2 = this;

    /**
    * @property {object} config - The p2 World configuration object.
    * @protected
    */
    this.config = config;

    /**
    * @property {p2.World} world - The p2 World in which the simulation is run.
    * @protected
    */
    this.world = new p2.World(this.config);

    /**
    * @property {number} frameRate - The frame rate the world will be stepped at. Defaults to 1 / 60, but you can change here. Also see useElapsedTime property.
    * @default
    */
    this.frameRate = 1 / 60;

    /**
    * @property {boolean} _paused - The paused state of the P2 World.
    * @default
    */
    this._paused = false;

    /**
     * @property {array} _toRemove - 一个临时数组 用于临时存储不立刻删除 需要在下一次渲染的时候删除掉的Tiny.physics.p2.Body 对象
     * @private
     */
    this._toRemove = [];

    /**
    * @property {object} _bodies - 存储管理物理系统中的所有的Tiny.physics.p2.Body 对象
    * @private
    */
    this._bodies = [];

    /**
    * @property {InversePointProxy} gravity - The gravity applied to all bodies each step.
    */
    this.gravity = new InversePointProxy(this, this.world.gravity);

    /**
    * @property {object} walls - 物理系统的四个边界 类似特朗普要修建的墨西哥wall一样 把物理系统中的对象封闭到这个墙内
    */
    this.walls = { left: null, right: null, top: null, bottom: null };

    /**
    * @property {number} _collisionGroupID - Internal var.
    * @private
    */
    this._collisionGroupID = 2;

    /**
       * @property {boolean} _boundsLeft - Internal var that keeps track of world bounds settings.
       * @private
       */
    this._boundsLeft = true;

    /**
    * @property {boolean} _boundsRight - Internal var that keeps track of world bounds settings.
    * @private
    */
    this._boundsRight = true;

    /**
    * @property {boolean} _boundsTop - Internal var that keeps track of world bounds settings.
    * @private
    */
    this._boundsTop = true;

    /**
    * @property {boolean} _boundsBottom - Internal var that keeps track of world bounds settings.
    * @private
    */
    this._boundsBottom = true;

    /**
    * @property {boolean} _boundsOwnGroup - Internal var that keeps track of world bounds settings.
    * @private
    */
    this._boundsOwnGroup = false;

    /**
    * @property {array} collisionGroups - An array containing the collision groups that have been defined in the World.
    */
    this.collisionGroups = [];

    /**
       * @property {Tiny.Physics.P2.CollisionGroup} nothingCollisionGroup - A default collision group.
       */
    this.nothingCollisionGroup = new CollisionGroup(1);

    /**
    * @property {Tiny.Physics.P2.CollisionGroup} boundsCollisionGroup - A default collision group.
    */
    this.boundsCollisionGroup = new CollisionGroup(2);

    /**
    * @property {Tiny.Physics.P2.CollisionGroup} everythingCollisionGroup - A default collision group.
    */
    this.everythingCollisionGroup = new CollisionGroup(2147483648);

    this._impactEvents = false;

    /**
    * @property {array<Tiny.Physics.P2.Material>} materials - A local array of all created Materials.
    * @protected
    */
    this.materials = [];

    this.world.on(EVENTS.ON_BEGIN_CONTACT, this.beginContactHandler, this);
    this.world.on(EVENTS.ON_END_CONTACT, this.endContactHandler, this);

    this.setBoundsToWorld(true, true, true, true, false);
  }

  /**
  * This will create a P2 Physics body on the given object or array of objects.
  * A object can only have 1 physics body active at any one time, and it can't be changed until the object is destroyed.
  * Note: When the object is enabled for P2 physics it has its anchor x/y set to 0.5 so it becomes centered.
  *
  * @method Tiny.Physics.P2.World#enable
  * @param {object|array|Tiny.Physics.P2.Group} object - The object to create the physics body on. Can also be an array or Group of objects, a body will be created on every child that has a `body` property.
  * @param {boolean} [debug=false] - Create a debug object to go with this body?
  * @param {boolean} [children=true] - Should a body be created on all children of this object? If true it will recurse down the display list as far as it can go.
  */
  enable(object, debug, children) {
    if (debug === undefined) { debug = false; }
    if (children === undefined) { children = true; }

    let i = 1;

    if (Array.isArray(object)) {
      i = object.length;

      while (i--) {
        if (object[i] instanceof Group) {
          this.enable(object[i].children, debug, children);
        } else {
          this.enableBody(object[i], debug);

          if (children && object[i].hasOwnProperty('children') && object[i].children.length > 0) {
            this.enable(object[i], debug, true);
          }
        }
        // this.enableBody(object[i], debug);
        // if (children && object[i].hasOwnProperty('children') && object[i].children.length > 0) {
        //   this.enable(object[i].children, debug, true);
        // }
      }
    } else {
      if (object instanceof Group) {
        this.enable(object.children, debug, children);
      } else {
        this.enableBody(object, debug);
        if (children && object.hasOwnProperty('children') && object.children.length > 0) {
          this.enable(object.children, debug, true);
        }
      }
      // this.enableBody(object, debug);

      // if (children && object.hasOwnProperty('children') && object.children.length > 0) {
      //   this.enable(object.children, debug, true);
      // }
    }
  }

  /**
  * Creates a P2 Physics body on the given object.
  * A object can only have 1 physics body active at any one time, and it can't be changed until the body is nulled.
  *
  * @method Tiny.Physics.P2.World#enableBody
  * @param {object} object - The object to create the physics body on. A body will only be created if this object has a null `body` property.
  * @param {boolean} debug - Create a debug object to go with this body?
  */
  enableBody(object, debug) {
    // console.log('enableBody', object.body);
    if (object.body === void 0) {
      object.body = new Body(this, object, object.x, object.y, 1);
      object.body.debug = debug;
      if (typeof object.anchor !== 'undefined') {
        object.anchor.set(0.5, 0.5);
      }
      // 添加到world中
      this.addBody(object.body);
    }
  }

  /**
  * Add a body to the world.
  *
  * @method Tiny.Physics.P2.World#addBody
  * @param {Tiny.Physics.P2.Body} body - The Body to add to the World.
  * @return {boolean} True if the Body was added successfully, otherwise false.
  */
  addBody(body) {
    if (this._toRemove) {
      for (let i = 0; i < this._toRemove.length; i++) {
        if (this._toRemove[i] === this) {
          this._toRemove.splice(i, 1);
        }
      }
    }

    if (body.data.world === this.world) {
      return false;
    } else {
      this.world.addBody(body.data);
      this.dispatch(EVENTS.ON_BODY_ADDED, body);
      if (this._bodies.indexOf(body) === -1) {
        this._bodies.push(body);
      }
      return true;
    }
  }

  /**
  * @private
  */
  preUpdate() {
    let i = this._toRemove.length;
    while (i--) {
      this.removeBody(this._toRemove[i]);
    }
    this._toRemove.length = 0;
  }

  /**
  * @private
  */
  update() {
    if (this.paused) {
      return;
    }
    this._bodies.forEach((body) => {
      body.preUpdate();
    });
    this.preUpdate();
    this._bodies.forEach((body) => {
      body.postUpdate();
    });
    this.world.step(this.frameRate);
  }

  /**
   * check if p2 physics system is setup
   * @method Tiny.Physics.P2.World#checkIfSetup
   */
  checkIfSetup() {
    if (this.app === null) {
      throw new Error('引擎未setup');
    }
  }

  /**
  * Clears all bodies from the simulation, resets callbacks and resets the collision bitmask.
  *
  * The P2 world is also cleared:
  *
  * * Removes all solver equations
  * * Removes all constraints
  * * Removes all bodies
  * * Removes all springs
  * * Removes all contact materials
  *
  * This is called automatically when you switch state.
  *
  * @method Tiny.Physics.P2.World#clear
  */
  clear() {
    this.world.time = 0;
    this.world.fixedStepTime = 0;

    // Remove all solver equations
    if (this.world.solver && this.world.solver.equations.length) {
      this.world.solver.removeAllEquations();
    }

    // Remove all constraints
    const cs = this.world.constraints;

    for (let i = cs.length - 1; i >= 0; i--) {
      this.world.removeConstraint(cs[i]);
    }

    // Remove all bodies
    const bodies = this.world.bodies;

    for (let i = bodies.length - 1; i >= 0; i--) {
      this.world.removeBody(bodies[i]);
    }

    // Remove all springs
    const springs = this.world.springs;

    for (let i = springs.length - 1; i >= 0; i--) {
      this.world.removeSpring(springs[i]);
    }

    // Remove all contact materials
    const cms = this.world.contactMaterials;

    for (let i = cms.length - 1; i >= 0; i--) {
      this.world.removeContactMaterial(cms[i]);
    }

    this.world.off(EVENTS.ON_BEGIN_CONTACT, this.beginContactHandler, this);
    this.world.off(EVENTS.ON_END_CONTACT, this.endContactHandler, this);

    this.postBroadphaseCallback = null;
    this.callbackContext = null;
    this.impactCallback = null;

    this.collisionGroups = [];
    this._toRemove = [];
    this.boundsCollidesWith = [];

    //  Remove the world bounds
    this.walls = { left: null, right: null, top: null, bottom: null };
  }

  /**
   * Starts the begin and end Contact listeners again.
   *
   * @method Tiny.Physics.P2.World#reset
   */
  reset() {
    this.world.on(EVENTS.ON_BEGIN_CONTACT, this.beginContactHandler, this);
    this.world.on(EVENTS.ON_END_CONTACT, this.endContactHandler, this);

    this.nothingCollisionGroup = new CollisionGroup(1);
    this.boundsCollisionGroup = new CollisionGroup(2);
    this.everythingCollisionGroup = new CollisionGroup(2147483648);

    this._collisionGroupID = 2;

    this.setBoundsToWorld(true, true, true, true, false);
  }

  /**
  * Clears all bodies from the simulation and unlinks World from Game. Should only be called on game shutdown. Call `clear` on a State change.
  *
  * @method Tiny.Physics.P2.World#destroy
  */
  destroy() {
    this.clear();
    if (this.app.physics === this) {
      this.app.physics = null;
    }
    this.app = null;
  }

  /**
  * fire event
  * @private
  * @method Tiny.Physics.P2.World#dispatch
  * @param {String} eventName
  * @param {any} eventData
  */
  dispatch(eventName, ...args) {
    // this.emit(eventName, ...args);
    this.emit.apply(this, arguments);
  }

  /**
  * Convert pixel value to p2 physics scale (meters).
  * By default uses a scale of 20px per meter.
  * If you need to modify this you can over-ride these functions via the Physics Configuration object.
  *
  * @method Tiny.Physics.P2.World#pxm
  * @param {number} v - The value to convert.
  * @return {number} The scaled value.
  */
  pxm(v) {
    return v * 0.05;
  }

  /**
  * Convert tiny value to p2 physics scale (meters) and inverses it.
  * By default uses a scale of 20px per meter.
  * If you need to modify this you can over-ride these functions via the Physics Configuration object.
  *
  * @method Tiny.Physics.P2.World#pxmi
  * @param {number} v - The value to convert.
  * @return {number} The scaled value.
  */
  pxmi(v) {
    return -this.pxm(v);
  }

  /**
  * Convert p2 physics value (meters) to pixel scale.
  * By default uses a scale of 20px per meter.
  * If you need to modify this you can over-ride these functions via the Physics Configuration object.
  *
  * @method Tiny.Physics.P2.World#mpx
  * @param {number} v - The value to convert.
  * @return {number} The scaled value.
  */
  mpx(v) {
    return v * 20;
  }

  /**
  * Convert p2 physics value (meters) to pixel scale and inverses it.
  * By default uses a scale of 20px per meter.
  * If you need to modify this you can over-ride these functions via the Physics Configuration object.
  *
  * @method Tiny.Physics.P2.World#mpxi
  * @param {number} v - The value to convert.
  * @return {number} The scaled value.
  */
  mpxi(v) {
    return -this.mpx(v);
  }

  /**
  * This will add a P2 Physics body into the removal list for the next step.
  *
  * @method Tiny.Physics.P2.World#removeBodyNextStep
  * @param {Tiny.Physics.P2.Body} body - The body to remove at the start of the next step.
  */
  removeBodyNextStep(body) { // 放到延迟删除临时队列 body - 要延迟到下一次渲染删除的Body对象
    this._toRemove.push(body);
  }

  /**
    * Removes a body from the world. This will silently fail if the body wasn't part of the world to begin with.
    *
    * @method Tiny.Physics.P2.World#removeBody
    * @param {Tiny.Physics.P2.Body} body - The Body to remove from the World.
    * @return {Tiny.Physics.P2.Body} The Body that was removed.
    */
  removeBody(body) {
    if (body.data.world === this.world) {
      this.world.removeBody(body.data);
      body.debug = false;
      this.dispatch(EVENTS.ON_BODY_REMOVED, body);
    }
    return body;
  }

  get paused() {
    return this._paused;
  }

  /**
   * Pauses the P2 World independent of the game pause state.
   *
   * @method Tiny.Physics.P2.World#resume
   */
  pause() {
    this._paused = true;
  }

  /**
  * Resumes a paused P2 World.
  *
  * @method Tiny.Physics.P2.World#resume
  */
  resume() {
    this._paused = false;
  }

  /**
   * Handles a p2 begin contact event.
   *
   * @method Tiny.Physics.P2.World#beginContactHandler
   * @param {object} event - The p2 event data.
   */
  beginContactHandler(event) {
    if (event.bodyA && event.bodyB) {
      this.dispatch(EVENTS.ON_BEGIN_CONTACT, {
        bodyA: event.bodyA.parent,
        bodyB: event.bodyB.parent,
        shapeA: event.shapeA,
        shapeB: event.shapeB,
        contactEquations: event.contactEquations,
      });

      if (event.bodyA.parent) {
        event.bodyA.parent.dispatch(EVENTS.ON_BEGIN_CONTACT,
          event.bodyB.parent,
          event.shapeB,
          event.bodyA.parent,
          event.shapeA,
          event.contactEquations);
      }

      if (event.bodyB.parent) {
        event.bodyB.parent.dispatch(EVENTS.ON_BEGIN_CONTACT,
          event.bodyA.parent,
          event.shapeA,
          event.bodyB.parent,
          event.shapeB,
          event.contactEquations);
      }
    }
  }

  /**
   * Handles a p2 end contact event.
   *
   * @method Tiny.Physics.P2.World#endContactHandler
   * @param {object} event - The event data.
   */
  endContactHandler(event) {
    if (event.bodyA && event.bodyB) {
      this.dispatch(EVENTS.ON_END_CONTACT, {
        bodyA: event.bodyA.parent,
        bodyB: event.bodyB.parent,
        shapeA: event.shapeA,
        shapeB: event.shapeB,
      });

      if (event.bodyA.parent) {
        event.bodyA.parent.dispatch(EVENTS.ON_END_CONTACT,
          event.bodyB.parent,
          event.bodyB,
          event.bodyA.parent,
          event.shapeA,
          event.shapeB);
      }

      if (event.bodyB.parent) {
        event.bodyB.parent.dispatch(EVENTS.ON_END_CONTACT,
          event.bodyA.parent,
          event.bodyA,
          event.shapeB.parent,
          event.shapeB);
      }
    }
  }

  /**
  * Creates a new Body and adds it to the World.
  *
  * @method Tiny.Physics.P2.World#createBody
  * @param {number} x - The x coordinate of Body.
  * @param {number} y - The y coordinate of Body.
  * @param {number} mass - The mass of the Body. A mass of 0 means a 'static' Body is created.
  * @param {boolean} [addToWorld=false] - Automatically add this Body to the world? (usually false as it won't have any shapes on construction).
  * @param {object} options - An object containing the build options:
  * @param {boolean} [options.optimalDecomp=false] - Set to true if you need optimal decomposition. Warning: very slow for polygons with more than 10 vertices.
  * @param {boolean} [options.skipSimpleCheck=false] - Set to true if you already know that the path is not intersecting itself.
  * @param {boolean|number} [options.removeCollinearPoints=false] - Set to a number (angle threshold value) to remove collinear points, or false to keep all points.
  * @param {(number[]|...number)} points - An array of 2d vectors that form the convex or concave polygon.
  *                                       Either [[0,0], [0,1],...] or a flat array of numbers that will be interpreted as [x,y, x,y, ...],
  *                                       or the arguments passed can be flat x,y values e.g. `setPolygon(options, x,y, x,y, x,y, ...)` where `x` and `y` are numbers.
  * @return {Tiny.Physics.P2.Body} The body
  */
  createBody(x, y, mass, addToWorld, options, data) {
    if (addToWorld === undefined) { addToWorld = false; }
    const body = new Body(this, null, x, y, mass);
    if (data) {
      const result = body.addPolygon(options, data);
      if (!result) {
        return false;
      }
    }
    if (addToWorld) {
      this.world.addBody(body.data);
    }
    return body;
  }

  /**
  * Sets the bounds of the Physics world to match the Game.World dimensions.
  * You can optionally set which 'walls' to create: left, right, top or bottom.
  *
  * @method Tiny.Physics.P2.World#setBoundsToWorld
  * @param {boolean} [left=true] - If true will create the left bounds wall.
  * @param {boolean} [right=true] - If true will create the right bounds wall.
  * @param {boolean} [top=true] - If true will create the top bounds wall.
  * @param {boolean} [bottom=true] - If true will create the bottom bounds wall.
  * @param {boolean} [setCollisionGroup=false] - If true the Bounds will be set to use its own Collision Group.
  */
  setBoundsToWorld(left, right, top, bottom, setCollisionGroup) {
    this.setBounds(0, 0, this.app.renderer.width, this.app.renderer.height, left, right, top, bottom, setCollisionGroup);
  }

  /**
  * Sets the bounds of the Physics world to match the given world pixel dimensions.
  * You can optionally set which 'walls' to create: left, right, top or bottom.
  * If none of the walls are given it will default to use the walls settings it had previously.
  * I.e. if you previously told it to not have the left or right walls, and you then adjust the world size
  * the newly created bounds will also not have the left and right walls.
  * Explicitly state them in the parameters to override this.
  *
  * @method Tiny.Physics.P2.World#setBounds
  * @param {number} x - The x coordinate of the top-left corner of the bounds.
  * @param {number} y - The y coordinate of the top-left corner of the bounds.
  * @param {number} width - The width of the bounds.
  * @param {number} height - The height of the bounds.
  * @param {boolean} [left=true] - If true will create the left bounds wall.
  * @param {boolean} [right=true] - If true will create the right bounds wall.
  * @param {boolean} [top=true] - If true will create the top bounds wall.
  * @param {boolean} [bottom=true] - If true will create the bottom bounds wall.
  * @param {boolean} [setCollisionGroup=false] - If true the Bounds will be set to use its own Collision Group.
  */
  setBounds(x, y, width, height, left, right, top, bottom, setCollisionGroup) {
    if (left === undefined) { left = this._boundsLeft; }
    if (right === undefined) { right = this._boundsRight; }
    if (top === undefined) { top = this._boundsTop; }
    if (bottom === undefined) { bottom = this._boundsBottom; }
    if (setCollisionGroup === undefined) { setCollisionGroup = this._boundsOwnGroup; }

    this.setupWall(left, 'left', x, y, 1.5707963267948966, setCollisionGroup);
    this.setupWall(right, 'right', x + width, y, -1.5707963267948966, setCollisionGroup);
    this.setupWall(top, 'top', x, y, -3.141592653589793, setCollisionGroup);
    this.setupWall(bottom, 'bottom', x, y + height, 0, setCollisionGroup);

    //  Remember the bounds settings in case they change later on via World.setBounds
    this._boundsLeft = left;
    this._boundsRight = right;
    this._boundsTop = top;
    this._boundsBottom = bottom;
    this._boundsOwnGroup = setCollisionGroup;
  }

  /**
   * Internal method called by setBounds. Responsible for creating, updating or
   * removing the wall body shapes.
   *
   * @method Tiny.Physics.P2.World#setupWall
   * @private
   * @param {boolean} create - True to create the wall shape, false to remove it.
   * @param {string} wall - The wall segment to update.
   * @param {number} x - The x coordinate of the wall.
   * @param {number} y - The y coordinate of the wall.
   * @param {float} angle - The angle of the wall.
   * @param {boolean} [setCollisionGroup=true] - If true the Bounds will be set to use its own Collision Group.
   */
  setupWall(create, wall, x, y, angle, setCollisionGroup) {
    console.log('setupWall', create, wall, x, y, angle, setCollisionGroup);
    if (create) {
      //  We need a left wall. Do we have one already?
      if (this.walls[wall]) {
        this.walls[wall].position = [this.pxmi(x), this.pxmi(y)];
      } else {
        var opts = { mass: 0, position: [this.pxmi(x), this.pxmi(y)], angle: angle };
        console.log(wall, opts);
        this.walls[wall] = new p2.Body(opts);
        this.walls[wall].addShape(new p2.Plane());
        this.world.addBody(this.walls[wall]);

        console.log('add wall');
      }

      if (setCollisionGroup) {
        this.walls[wall].shapes[0].collisionGroup = this.boundsCollisionGroup.mask;
        console.log('setCollisionGroup', this.boundsCollisionGroup.mask);
      }
    } else {
      if (this.walls[wall]) {
        this.world.removeBody(this.walls[wall]);
        this.walls[wall] = null;
      }
    }
  }

  /**
  * Sets the given material against the 4 bounds of this World.
  *
  * @method Tiny.Physics.P2.World#setWallMaterial
  * @param {Tiny.Physics.P2.Material} material - The material to set.
  * @param {boolean} [left=true] - If true will set the material on the left bounds wall.
  * @param {boolean} [right=true] - If true will set the material on the right bounds wall.
  * @param {boolean} [top=true] - If true will set the material on the top bounds wall.
  * @param {boolean} [bottom=true] - If true will set the material on the bottom bounds wall.
  */
  setWallMaterial(material, left = true, right = true, top = true, bottom = true) {
    if (left && this.walls.left) {
      this.walls.left.shapes[0].material = material;
    }

    if (right && this.walls.right) {
      this.walls.right.shapes[0].material = material;
    }

    if (top && this.walls.top) {
      this.walls.top.shapes[0].material = material;
    }

    if (bottom && this.walls.bottom) {
      this.walls.bottom.shapes[0].material = material;
    }
  }

  /**
   * By default the World will be set to collide everything with everything. The bounds of the world is a Body with 4 shapes, one for each face.
   * If you start to use your own collision groups then your objects will no longer collide with the bounds.
   * To fix this you need to adjust the bounds to use its own collision group first BEFORE changing your Sprites collision group.
   *
   * @method Tiny.Physics.P2.World#updateBoundsCollisionGroup
   * @param {boolean} [setCollisionGroup=true] - If true the Bounds will be set to use its own Collision Group.
   */
  updateBoundsCollisionGroup(setCollisionGroup = true) {
    const mask = setCollisionGroup ? this.boundsCollisionGroup.mask : this.everythingCollisionGroup.mask;

    if (this.walls.left) {
      this.walls.left.shapes[0].collisionGroup = mask;
    }

    if (this.walls.right) {
      this.walls.right.shapes[0].collisionGroup = mask;
    }

    if (this.walls.top) {
      this.walls.top.shapes[0].collisionGroup = mask;
    }

    if (this.walls.bottom) {
      this.walls.bottom.shapes[0].collisionGroup = mask;
    }

    this._boundsOwnGroup = setCollisionGroup;
  }

  /**
  * A JSON representation of the world.
  *
  * @method Tiny.Physics.P2.World#toJSON
  * @return {object} A JSON representation of the world.
  * @see p2.world#toJSON.
  */
  toJSON() {
    return this.world.toJSON();
  }

  /**
  * @name Tiny.Physics.P2.World#friction
  * @property {number} friction - Friction between colliding bodies. This value is used if no matching ContactMaterial is found for a Material pair.
  */
  get friction() {
    // 摩擦系数 - 对应于 p2.world.defaultContactMaterial.friction
    return this.world.defaultContactMaterial.friction;
  }
  set friction(value) {
    this.world.defaultContactMaterial.friction = value;
  }

  /**
  * @name Tiny.Physics.P2.World#restitution
  * @property {number} restitution - Default coefficient of restitution between colliding bodies. This value is used if no matching ContactMaterial is found for a Material pair.
  */
  get restitution() {
    // 反弹系数 - 对应于 p2.world.defaultContactMaterial.restitution
    return this.world.defaultContactMaterial.restitution;
  }
  set restitution(value) {
    this.world.defaultContactMaterial.restitution = value;
  }

  /**
  * @name Tiny.Physics.P2.World#defaultContactMaterial
  * @property {p2.ContactMaterial} defaultContactMaterial - The default Contact Material being used by the World.
  * @see p2.world#defaultContactMaterial
  */
  get defaultContactMaterial() {
    // 默认材质 对应于 p2.world.defaultContactMaterial
    return this.world.defaultContactMaterial;
  }
  set defaultContactMaterial(value) {
    this.world.defaultContactMaterial = value;
  }

  /**
  * @name Tiny.Physics.P2.World#applySpringForces
  * @property {boolean} applySpringForces - Enable to automatically apply spring forces each step.
  * @see p2.world#applySpringForces
  */
  get applySpringForces() {
    // 参考p2.world.applySpringForces
    return this.world.applySpringForces;
  }
  set applySpringForces(value) {
    this.world.applySpringForces = value;
  }

  /**
  * @name Tiny.Physics.P2.World#applyDamping
  * @property {boolean} applyDamping - Enable to automatically apply body damping each step.
  * @see p2.world#applyDamping
  */
  get applyDamping() {
    // 旋转运动阻尼
    return this.world.applyDamping;
  }
  set applyDamping(value) {
    this.world.applyDamping = value;
  }

  /**
  * @name Tiny.Physics.P2.World#applyGravity
  * @property {boolean} applyGravity - Enable to automatically apply gravity each step.
  * @see p2.world#applyGravity
  */
  get applyGravity() {
    return this.world.applyGravity;
  }
  set applyGravity(value) {
    this.world.applyGravity = value;
  }

  /**
  * @name Tiny.Physics.P2.World#solveConstraints
  * @property {boolean} solveConstraints - Enable/disable constraint solving in each step.
  * @see p2.world#solveConstraints
  */
  get solveConstraints() {
    return this.world.solveConstraints;
  }
  set solveConstraints(value) {
    this.world.solveConstraints = value;
  }

  /**
  * @name Tiny.Physics.P2.World#time
  * @property {boolean} time - The p2 world time.
  * @readonly
  * @see p2.world#time
  */
  get time() {
    return this.world.time;
  }

  /**
  * @name Tiny.Physics.P2.World#emitImpactEvent
  * @property {boolean} emitImpactEvent - Set to true if you want to the world to emit the "impact" event. Turning this off could improve performance.
  * @see p2.world#emitImpactEvent
  */
  get emitImpactEvent() {
    return this.world.emitImpactEvent;
  }
  set emitImpactEvent(value) {
    this.world.emitImpactEvent = value;
  }

  /**
  * p2.World.BODY_SLEEPING
  * How to deactivate bodies during simulation. Possible modes are: World.NO_SLEEPING, World.BODY_SLEEPING and World.ISLAND_SLEEPING.
  * If sleeping is enabled, you might need to wake up the bodies if they fall asleep when they shouldn't. If you want to enable sleeping in the world, but want to disable it for a particular body, see Body.allowSleep.
  * @name Tiny.Physics.P2.World#sleepMode
  * @property {number} sleepMode
  * @see p2.world#sleepMode
  */
  get sleepMode() {
    return this.world.sleepMode;
  }
  set sleepMode(value) {
    this.world.sleepMode = value;
  }

  /**
  * @name Tiny.Physics.P2.World#bodyCount
  * @property {number} bodyCount - The total number of bodies in the world.
  * @readonly
  */
  get bodyCount() {
    return this.world.bodies.length;
  }

  /**
  * Test if a world point overlaps bodies. You will get an array of actual P2 bodies back. You can find out which Sprite a Body belongs to
  * (if any) by checking the Body.parent.sprite property. Body.parent is a Tiny.Physics.P2.Body property.
  *
  * @method Tiny.Physics.P2.World#hitTest
  * @param {Tiny.Point} worldPoint - Point to use for intersection tests. The points values must be in world (pixel) coordinates.
  * @param {Array<Tiny.Physics.P2.Body|Tiny.Sprite|p2.Body>} [bodies] - A list of objects to check for intersection. If not given it will check Tiny.Physics.P2.world.bodies (i.e. all world bodies)
  * @param {number} [precision=5] - Used for matching against particles and lines. Adds some margin to these infinitesimal objects.
  * @param {boolean} [filterStatic=false] - If true all Static objects will be removed from the results array.
  * @return {Array} Array of bodies that overlap the point.
  */
  hitTest(worldPoint, bodies, precision, filterStatic) {
    if (bodies === undefined) { bodies = this.world.bodies; }
    if (precision === undefined) { precision = 5; }
    if (filterStatic === undefined) { filterStatic = false; }

    const physicsPosition = [this.pxmi(worldPoint.x), this.pxmi(worldPoint.y)];

    const query = [];
    let i = bodies.length;

    while (i--) {
      if (bodies[i] instanceof Body && !(filterStatic && bodies[i].data.type === p2.Body.STATIC)) {
        query.push(bodies[i].data);
      } else if (bodies[i] instanceof p2.Body && bodies[i].parent && !(filterStatic && bodies[i].type === p2.Body.STATIC)) {
        query.push(bodies[i]);
      } else if (bodies[i] instanceof Tiny.Sprite && bodies[i].hasOwnProperty('body') && !(filterStatic && bodies[i].body.data.type === p2.Body.STATIC)) {
        query.push(bodies[i].body.data);
      }
    }
    return this.world.hitTest(physicsPosition, query, precision);
  }

  /**
  * Checks the given object to see if it has a p2.Body and if so returns it.
  *
  * @method Tiny.Physics.P2.World#getBody
  * @param {object} object - The object to check for a p2.Body on.
  * @return {p2.Body} The p2.Body, or null if not found.
  */
  getBody(object) {
    if (object instanceof p2.Body) {
      //  Native p2 body
      return object;
    } else if (object instanceof Body) {
      //  Tiny P2 Body
      return object.data;
    } else if (object['body'] && object['body'].type === BODY_TYPE) {
      // any extends type has Tiny.Physics.P2.Body
      return object.body.data;
    }
    return null;
  }

  /**
  * Populates and returns an array with references to of all current Bodies in the world.
  *
  * @method Tiny.Physics.P2.World#getBodies
  * @return {array<Tiny.Physics.P2.Body>} An array containing all current Bodies in the world.
  */
  getBodies() {
    const output = [];
    let i = this.world.bodies.length;
    while (i--) {
      output.push(this.world.bodies[i].parent);
    }
    return output;
  }

  /**
  * Adds a Spring to the world.
  *
  * @method Tiny.Physics.P2.World#addSpring
  * @param {Tiny.Physics.P2.Spring|p2.LinearSpring|p2.RotationalSpring} spring - The Spring to add to the World.
  * @return {Tiny.Physics.P2.Spring} The Spring that was added.
  */
  addSpring(spring) {
    if (spring instanceof Spring || spring instanceof RotationalSpring) {
      this.world.addSpring(spring.data);
    } else {
      this.world.addSpring(spring);
    }
    this.dispatch(EVENTS.ON_SPRING_ADDED, spring);
    return spring;
  }

  /**
  * Creates a linear spring, connecting two bodies. A spring can have a resting length, a stiffness and damping.
  *
  * @method Tiny.Physics.P2.World#createSpring
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {number} [restLength=1] - Rest length of the spring. A number > 0.
  * @param {number} [stiffness=100] - Stiffness of the spring. A number >= 0.
  * @param {number} [damping=1] - Damping of the spring. A number >= 0.
  * @param {Array} [worldA] - Where to hook the spring to body A in world coordinates. This value is an array by 2 elements, x and y, i.e: [32, 32].
  * @param {Array} [worldB] - Where to hook the spring to body B in world coordinates. This value is an array by 2 elements, x and y, i.e: [32, 32].
  * @param {Array} [localA] - Where to hook the spring to body A in local body coordinates. This value is an array by 2 elements, x and y, i.e: [32, 32].
  * @param {Array} [localB] - Where to hook the spring to body B in local body coordinates. This value is an array by 2 elements, x and y, i.e: [32, 32].
  * @return {Tiny.Physics.P2.Spring} The spring
  */
  createSpring(bodyA, bodyB, restLength, stiffness, damping, worldA, worldB, localA, localB) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Spring, invalid body objects given');
    } else {
      return this.addSpring(new Spring(this, bodyA, bodyB, restLength, stiffness, damping, worldA, worldB, localA, localB));
    }
  }

  /**
  * Creates a rotational spring, connecting two bodies. A spring can have a resting length, a stiffness and damping.
  *
  * @method Tiny.Physics.P2.World#createRotationalSpring
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {number} [restAngle] - The relative angle of bodies at which the spring is at rest. If not given, it's set to the current relative angle between the bodies.
  * @param {number} [stiffness=100] - Stiffness of the spring. A number >= 0.
  * @param {number} [damping=1] - Damping of the spring. A number >= 0.
  * @return {Tiny.Physics.P2.RotationalSpring} The spring
  */
  createRotationalSpring(bodyA, bodyB, restAngle, stiffness, damping) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Rotational Spring, invalid body objects given');
    } else {
      return this.addSpring(new RotationalSpring(this, bodyA, bodyB, restAngle, stiffness, damping));
    }
  }

  /**
  * Removes a Spring from the world.
  *
  * @method Tiny.Physics.P2.World#removeSpring
  * @param {Tiny.Physics.P2.Spring} spring - The Spring to remove from the World.
  * @return {Tiny.Physics.P2.Spring} The Spring that was removed.
  */
  removeSpring(spring) {
    if (spring instanceof Spring || spring instanceof RotationalSpring) {
      this.world.removeSpring(spring.data);
    } else {
      this.world.removeSpring(spring);
    }
    this.dispatch(EVENTS.ON_SPRING_REMOVED, spring);
    return spring;
  }

  /**
  * Populates and returns an array of all current Springs in the world.
  *
  * @method Tiny.Physics.P2.World#getSprings
  * @return {array<Tiny.Physics.P2.Spring>} An array containing all current Springs in the world.
  */
  getSprings() {
    const output = [];
    let i = this.world.springs.length;
    while (i--) {
      output.push(this.world.springs[i].parent);
    }
    return output;
  }

  /**
  * Populates and returns an array of all current Constraints in the world.
  * You will get an array of p2 constraints back. This can be of mixed types, for example the array may contain
  * PrismaticConstraints, RevoluteConstraints or any other valid p2 constraint type.
  *
  * @method Tiny.Physics.P2.World#getConstraints
  * @return {array<Tiny.Physics.P2.Constraint>} An array containing all current Constraints in the world.
  */
  getConstraints() {
    const output = [];
    let i = this.world.constraints.length;
    while (i--) {
      output.push(this.world.constraints[i]);
    }
    return output;
  }

  /**
  * Locks the relative position between two bodies.
  *
  * @method Tiny.Physics.P2.World#createLockConstraint
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {Array} [offset] - The offset of bodyB in bodyA's frame. The value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {number} [angle=0] - The angle of bodyB in bodyA's frame.
  * @param {number} [maxForce] - The maximum force that should be applied to constrain the bodies.
  * @return {Tiny.Physics.P2.LockConstraint} The constraint
  */
  createLockConstraint(bodyA, bodyB, offset, angle, maxForce) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Constraint, invalid body objects given');
    } else {
      return this.addConstraint(new LockConstraint(this, bodyA, bodyB, offset, angle, maxForce));
    }
  }

  /**
  * Creates a constraint that tries to keep the distance between two bodies constant.
  *
  * @method Tiny.Physics.P2.World#createDistanceConstraint
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {number} distance - The distance to keep between the bodies.
  * @param {Array} [localAnchorA] - The anchor point for bodyA, defined locally in bodyA frame. Defaults to [0,0].
  * @param {Array} [localAnchorB] - The anchor point for bodyB, defined locally in bodyB frame. Defaults to [0,0].
  * @param {number} [maxForce] - The maximum force that should be applied to constrain the bodies.
  * @return {Tiny.Physics.P2.DistanceConstraint} The constraint
  */
  createDistanceConstraint(bodyA, bodyB, distance, localAnchorA, localAnchorB, maxForce) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Constraint, invalid body objects given');
    } else {
      return this.addConstraint(new DistanceConstraint(this, bodyA, bodyB, distance, localAnchorA, localAnchorB, maxForce));
    }
  }

  /**
  * Creates a constraint that tries to keep the distance between two bodies constant.
  *
  * @method Tiny.Physics.P2.World#createGearConstraint
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {number} [angle=0] - The relative angle
  * @param {number} [ratio=1] - The gear ratio.
  * @return {Tiny.Physics.P2.GearConstraint} The constraint
  */
  createGearConstraint(bodyA, bodyB, angle, ratio) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Constraint, invalid body objects given');
    } else {
      return this.addConstraint(new GearConstraint(this, bodyA, bodyB, angle, ratio));
    }
  }

  /**
  * Connects two bodies at given offset points, letting them rotate relative to each other around this point.
  * The pivot points are given in world (pixel) coordinates.
  *
  * @method Tiny.Physics.P2.World#createRevoluteConstraint
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Array} pivotA - The point relative to the center of mass of bodyA which bodyA is constrained to. The value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {Array} pivotB - The point relative to the center of mass of bodyB which bodyB is constrained to. The value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {number} [maxForce=0] - The maximum force that should be applied to constrain the bodies.
  * @param {Float32Array} [worldPivot=null] - A pivot point given in world coordinates. If specified, localPivotA and localPivotB are automatically computed from this value.
  * @return {Tiny.Physics.P2.RevoluteConstraint} The constraint
  */
  createRevoluteConstraint(bodyA, pivotA, bodyB, pivotB, maxForce, worldPivot) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Constraint, invalid body objects given');
    } else {
      return this.addConstraint(new RevoluteConstraint(this, bodyA, pivotA, bodyB, pivotB, maxForce, worldPivot));
    }
  }

  /**
  * Constraint that only allows bodies to move along a line, relative to each other.
  * See http://www.iforce2d.net/b2dtut/joints-prismatic
  *
  * @method Tiny.Physics.P2.World#createPrismaticConstraint
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyA - First connected body.
  * @param {Tiny.Sprite|Tiny.Physics.P2.Body|p2.Body} bodyB - Second connected body.
  * @param {boolean} [lockRotation=true] - If set to false, bodyB will be free to rotate around its anchor point.
  * @param {Array} [anchorA] - Body A's anchor point, defined in its own local frame. The value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {Array} [anchorB] - Body A's anchor point, defined in its own local frame. The value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {Array} [axis] - An axis, defined in body A frame, that body B's anchor point may slide along. The value is an array with 2 elements matching x and y, i.e: [32, 32].
  * @param {number} [maxForce] - The maximum force that should be applied to constrain the bodies.
  * @return {Tiny.Physics.P2.PrismaticConstraint} The constraint
  * @see {@link http://www.iforce2d.net/b2dtut/joints-prismatic}
  */
  createPrismaticConstraint(bodyA, bodyB, lockRotation, anchorA, anchorB, axis, maxForce) {
    bodyA = this.getBody(bodyA);
    bodyB = this.getBody(bodyB);
    if (!bodyA || !bodyB) {
      console.warn('Cannot create Constraint, invalid body objects given');
    } else {
      return this.addConstraint(new PrismaticConstraint(this, bodyA, bodyB, lockRotation, anchorA, anchorB, axis, maxForce));
    }
  }

  /**
  * Adds a Constraint to the world.
  *
  * @method Tiny.Physics.P2.World#addConstraint
  * @param {Tiny.Physics.P2.Constraint} constraint - The Constraint to add to the World.
  * @return {Tiny.Physics.P2.Constraint} The Constraint that was added.
  */
  addConstraint(constraint) {
    this.world.addConstraint(constraint);
    this.dispatch(EVENTS.ON_CONSTRAIN_ADDED, constraint);
    return constraint;
  }

  /**
  * Removes a Constraint from the world.
  *
  * @method Tiny.Physics.P2.World#removeConstraint
  * @param {Tiny.Physics.P2.Constraint} constraint - The Constraint to be removed from the World.
  * @return {Tiny.Physics.P2.Constraint} The Constraint that was removed.
  */
  removeConstraint(constraint) {
    this.world.removeConstraint(constraint);
    this.dispatch(EVENTS.ON_CONSTRAIN_REMOVED, constraint);
    return constraint;
  }

  /**
   * Adds a Contact Material to the world.
   *
   * @method Tiny.Physics.P2.World#addContactMaterial
   * @param {Tiny.Physics.P2.ContactMaterial} material - The Contact Material to be added to the World.
   * @return {Tiny.Physics.P2.ContactMaterial} The Contact Material that was added.
   */
  addContactMaterial(material) {
    this.world.addContactMaterial(material);
    this.dispatch(EVENTS.ON_CONTACTMATERIAL_ADDED, material);
    return material;
  }

  /**
   * Removes a Contact Material from the world.
   *
   * @method Tiny.Physics.P2.World#removeContactMaterial
   * @param {Tiny.Physics.P2.ContactMaterial} material - The Contact Material to be removed from the World.
   * @return {Tiny.Physics.P2.ContactMaterial} The Contact Material that was removed.
   */
  removeContactMaterial(material) {
    this.world.removeContactMaterial(material);
    this.dispatch(EVENTS.ON_CONTACTMATERIAL_REMOVED, material);
    return material;
  }

  /**
  * Gets a Contact Material based on the two given Materials.
  *
  * @method Tiny.Physics.P2.World#getContactMaterial
  * @param {Tiny.Physics.P2.Material} materialA - The first Material to search for.
  * @param {Tiny.Physics.P2.Material} materialB - The second Material to search for.
  * @return {Tiny.Physics.P2.ContactMaterial|boolean} The Contact Material or false if none was found matching the Materials given.
  */
  getContactMaterial(materialA, materialB) {
    return this.world.getContactMaterial(materialA, materialB);
  }

  /**
  * Sets the given Material against all Shapes owned by all the Bodies in the given array.
  *
  * @method Tiny.Physics.P2.World#setMaterial
  * @param {Tiny.Physics.P2.Material} material - The Material to be applied to the given Bodies.
  * @param {array<Tiny.Physics.P2.Body>} bodies - An Array of Body objects that the given Material will be set on.
  */
  setMaterial(material, bodies) {
    let i = bodies.length;
    while (i--) {
      bodies[i].setMaterial(material);
    }
  }

  /**
  * Creates a Material. Materials are applied to Shapes owned by a Body and can be set with Body.setMaterial().
  * Materials are a way to control what happens when Shapes collide. Combine unique Materials together to create Contact Materials.
  * Contact Materials have properties such as friction and restitution that allow for fine-grained collision control between different Materials.
  *
  * @method Tiny.Physics.P2.World#createMaterial
  * @param {string} [name] - Optional name of the Material. Each Material has a unique ID but string names are handy for debugging.
  * @param {Tiny.Physics.P2.Body} [body] - Optional Body. If given it will assign the newly created Material to the Body shapes.
  * @return {Tiny.Physics.P2.Material} The Material that was created. This is also stored in Tiny.Physics.P2.materials.
  */
  createMaterial(name, body) {
    name = name || '';
    const material = new Material(name);
    this.materials.push(material);
    if (typeof body !== 'undefined') {
      body.setMaterial(material);
    }
    return material;
  }

  /**
   * Creates a Contact Material from the two given Materials. You can then edit the properties of the Contact Material directly.
   *
   * @method Tiny.Physics.P2.World#createContactMaterial
   * @param {Tiny.Physics.P2.Material} [materialA] - The first Material to create the ContactMaterial from. If undefined it will create a new Material object first.
   * @param {Tiny.Physics.P2.Material} [materialB] - The second Material to create the ContactMaterial from. If undefined it will create a new Material object first.
   * @param {object} [options] - Material options object.
   * @return {Tiny.Physics.P2.ContactMaterial} The Contact Material that was created.
   */
  createContactMaterial(materialA, materialB, options) {
    if (materialA === undefined) { materialA = this.createMaterial(); }
    if (materialB === undefined) { materialB = this.createMaterial(); }
    const contact = new ContactMaterial(materialA, materialB, options);
    return this.addContactMaterial(contact);
  }

  /**
  * Creates a new Collision Group and optionally applies it to the given object.
  * Collision Groups are handled using bitmasks, therefore you have a fixed limit you can create before you need to re-use older groups.
  *
  * @method Tiny.Physics.P2.World#createCollisionGroup
  * @param {Tiny.Group|Tiny.Sprite} [object] - An optional Sprite or Group to apply the Collision Group to. If a Group is given it will be applied to all top-level children.
  */
  createCollisionGroup(object) {
    const bitmask = Math.pow(2, this._collisionGroupID);
    if (this.walls.left) {
      this.walls.left.shapes[0].collisionMask = this.walls.left.shapes[0].collisionMask | bitmask;
    }
    if (this.walls.right) {
      this.walls.right.shapes[0].collisionMask = this.walls.right.shapes[0].collisionMask | bitmask;
    }
    if (this.walls.top) {
      this.walls.top.shapes[0].collisionMask = this.walls.top.shapes[0].collisionMask | bitmask;
    }
    if (this.walls.bottom) {
      this.walls.bottom.shapes[0].collisionMask = this.walls.bottom.shapes[0].collisionMask | bitmask;
    }
    this._collisionGroupID++;
    const group = new CollisionGroup(bitmask);
    this.collisionGroups.push(group);
    if (object) {
      this.setCollisionGroup(object, group);
    }
    return group;
  }

  /**
  * Sets the given CollisionGroup to be the collision group for all shapes in this Body, unless a shape is specified.
  * Note that this resets the collisionMask and any previously set groups. See Body.collides() for appending them.
  *
  * @method Tiny.Physics.P2.World#setCollisionGroup
  * @param {Tiny.Group|Tiny.Sprite} object - A Sprite or Group to apply the Collision Group to. If a Group is given it will be applied to all top-level children.
  * @param {Tiny.Physics.CollisionGroup} group - The Collision Group that this Bodies shapes will use.
  */
  setCollisionGroup(object, group) {
    if (object instanceof Group) {
      for (let i = 0; i < object.total; i++) {
        if (object.children[i]['body'] && object.children[i]['body'].type === BODY_TYPE) {
          object.children[i].body.setCollisionGroup(group);
        }
      }
    } else {
      object.body.setCollisionGroup(group);
    }
  }

  /**
  * Handles a p2 impact event.
  *
  * @method Tiny.Physics.P2.World#impactHandler
  * @private
  * @param {object} event - The event data.
  */
  impactHandler(event) {
    if (event.bodyA.parent && event.bodyB.parent) {
      //  Body vs. Body callbacks
      const a = event.bodyA.parent;
      const b = event.bodyB.parent;

      if (a._bodyCallbacks[event.bodyB.id]) {
        a._bodyCallbacks[event.bodyB.id].call(a._bodyCallbackContext[event.bodyB.id], a, b, event.shapeA, event.shapeB);
      }

      if (b._bodyCallbacks[event.bodyA.id]) {
        b._bodyCallbacks[event.bodyA.id].call(b._bodyCallbackContext[event.bodyA.id], b, a, event.shapeB, event.shapeA);
      }

      //  Body vs. Group callbacks
      if (a._groupCallbacks[event.shapeB.collisionGroup]) {
        a._groupCallbacks[event.shapeB.collisionGroup].call(a._groupCallbackContext[event.shapeB.collisionGroup], a, b, event.shapeA, event.shapeB);
      }

      if (b._groupCallbacks[event.shapeA.collisionGroup]) {
        b._groupCallbacks[event.shapeA.collisionGroup].call(b._groupCallbackContext[event.shapeA.collisionGroup], b, a, event.shapeB, event.shapeA);
      }
    }
  }

  /**
  * Impact event handling is disabled by default. Enable it before any impact events will be dispatched.
  * In a busy world hundreds of impact events can be generated every step, so only enable this if you cannot do what you need via beginContact or collision masks.
  *
  * @method Tiny.Physics.P2.World#setImpactEvents
  * @param {boolean} state - Set to true to enable impact events, or false to disable.
  */
  setupImpactEvents(enable = true) {
    if (this._impactEvents === enable) return;
    if (enable) {
      this.world.on('impact', this.impactHandler, this);
    } else {
      this.world.off('impact', this.impactHandler, this);
    }
    this._impactEvents = enable;
  }
}

export default World;
