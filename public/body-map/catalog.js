/**
 * CareFlow Body Map — canonical body-part taxonomy and proactive hit-mesh builder.
 * Single source of truth: every markable region is declared here with explicit geometry rules.
 * assets/new.svg #layer1 paths are reference anchors only (not used for hit testing).
 */
(function (global) {
  'use strict';

  /** Clinical body-part names (dropdown / CQC export) */
  var BODY_PART_NAMES = [
    'Head', 'Scalp', 'Occiput', 'Neck', 'Shoulder', 'Upper arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Fingers',
    'Chest', 'Abdomen', 'Pelvis / groin', 'Upper back', 'Lower back', 'Sacrum', 'Buttock',
    'Hip', 'Thigh', 'Knee', 'Lower leg / shin', 'Calf', 'Ankle', 'Foot', 'Heel', 'Toes',
    'Forehead', 'Left eyebrow', 'Right eyebrow', 'Left temple', 'Right temple',
    'Left eye', 'Right eye', 'Nose', 'Left cheek', 'Right cheek', 'Left ear', 'Right ear',
    'Mouth', 'Lips', 'Chin', 'Left jaw', 'Right jaw',
    'Palm', 'Thumb', 'Index finger', 'Middle finger', 'Ring finger', 'Little finger', 'Knuckle',
    'Ball of foot', 'Arch', 'Big toe', 'Second toe', 'Third toe', 'Fourth toe', 'Little toe', 'Achilles',
  ];

  var ANATOMY_GROUPS = {
    'Head & neck': ['Head', 'Scalp', 'Occiput', 'Neck', 'Forehead', 'Eyebrow', 'Temple', 'Eye', 'Nose', 'Cheek', 'Ear', 'Mouth', 'Lips', 'Chin', 'Jaw'],
    'Head & face detail': ['Forehead', 'Eyebrow', 'Temple', 'Eye', 'Nose', 'Cheek', 'Ear', 'Mouth', 'Lips', 'Chin', 'Jaw'],
    'Trunk — front': ['Chest', 'Abdomen', 'Pelvis / groin'],
    'Trunk — back': ['Upper back', 'Lower back', 'Sacrum', 'Buttock'],
    'Upper limb': ['Shoulder', 'Upper arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Fingers', 'Palm', 'Thumb', 'Index finger', 'Middle finger', 'Ring finger', 'Little finger', 'Knuckle'],
    'Lower limb': ['Hip', 'Thigh', 'Knee', 'Lower leg / shin', 'Calf', 'Ankle', 'Foot', 'Heel', 'Toes', 'Ball of foot', 'Arch', 'Big toe', 'Second toe', 'Third toe', 'Fourth toe', 'Little toe', 'Achilles'],
  };

  function spec(id, part, side, figure, group, build) {
    return { id: id, part: part, side: side, figure: figure, group: group, build: build };
  }

  function trunkSplit(idBase, part, figure, group, ref) {
    if (figure === 'front') {
      return [
        spec(idBase + '-left', part, 'Left', figure, group, { type: 'splitLR', ref: ref, zone: 'right' }),
        spec(idBase + '-centre', part, 'Centre', figure, group, { type: 'splitLR', ref: ref, zone: 'centre' }),
        spec(idBase + '-right', part, 'Right', figure, group, { type: 'splitLR', ref: ref, zone: 'left' }),
      ];
    }
    return [
      spec(idBase + '-left', part, 'Left', figure, group, { type: 'splitLR', ref: ref, zone: 'left' }),
      spec(idBase + '-centre', part, 'Centre', figure, group, { type: 'splitLR', ref: ref, zone: 'centre' }),
      spec(idBase + '-right', part, 'Right', figure, group, { type: 'splitLR', ref: ref, zone: 'right' }),
    ];
  }

  function limbPair(idBase, part, figure, group, buildLeft, buildRight) {
    return [
      spec('left-' + idBase, part, 'Left', figure, group, buildLeft),
      spec('right-' + idBase, part, 'Right', figure, group, buildRight),
    ];
  }

  function mirrorRef(ref) {
    return ref.replace(/^left-/, 'RIGHT-').replace(/^right-/, 'left-').replace(/^RIGHT-/, 'right-');
  }

  /** Clip zones on head-front / head-back paths (layer1 local coords) */
  function headZoneBox(b, zone) {
    if (!b) return null;
    var x = b.x;
    var y = b.y;
    var w = b.width;
    var h = b.height;
    switch (zone) {
      case 'forehead': return { x: x + w * 0.2, y: y, width: w * 0.6, height: h * 0.26 };
      case 'eyebrowLeft': return { x: x + w * 0.5, y: y + h * 0.2, width: w * 0.34, height: h * 0.12 };
      case 'eyebrowRight': return { x: x + w * 0.16, y: y + h * 0.2, width: w * 0.34, height: h * 0.12 };
      case 'eyeLeft': return { x: x + w * 0.5, y: y + h * 0.28, width: w * 0.34, height: h * 0.16 };
      case 'eyeRight': return { x: x + w * 0.16, y: y + h * 0.28, width: w * 0.34, height: h * 0.16 };
      case 'templeLeft': return { x: x + w * 0.74, y: y + h * 0.16, width: w * 0.22, height: h * 0.22 };
      case 'templeRight': return { x: x + w * 0.04, y: y + h * 0.16, width: w * 0.22, height: h * 0.22 };
      case 'earLeft': return { x: x + w * 0.8, y: y + h * 0.26, width: w * 0.22, height: h * 0.34 };
      case 'earRight': return { x: x - w * 0.02, y: y + h * 0.26, width: w * 0.22, height: h * 0.34 };
      case 'nose': return { x: x + w * 0.36, y: y + h * 0.34, width: w * 0.28, height: h * 0.22 };
      case 'cheekLeft': return { x: x + w * 0.62, y: y + h * 0.38, width: w * 0.32, height: h * 0.24 };
      case 'cheekRight': return { x: x + w * 0.06, y: y + h * 0.38, width: w * 0.32, height: h * 0.24 };
      case 'mouth': return { x: x + w * 0.3, y: y + h * 0.5, width: w * 0.4, height: h * 0.14 };
      case 'lips': return { x: x + w * 0.32, y: y + h * 0.53, width: w * 0.36, height: h * 0.1 };
      case 'chin': return { x: x + w * 0.26, y: y + h * 0.66, width: w * 0.48, height: h * 0.3 };
      case 'jawLeft': return { x: x + w * 0.6, y: y + h * 0.54, width: w * 0.3, height: h * 0.24 };
      case 'jawRight': return { x: x + w * 0.1, y: y + h * 0.54, width: w * 0.3, height: h * 0.24 };
      case 'scalp': return { x: x + w * 0.12, y: y, width: w * 0.76, height: h * 0.34 };
      case 'occiput': return { x: x + w * 0.22, y: y + h * 0.26, width: w * 0.56, height: h * 0.38 };
      default: return null;
    }
  }

  function headFaceDetail(figure, headRef) {
    var g = 'Head & face detail';
    return [
      spec('hf-forehead-' + figure, 'Forehead', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'forehead' }),
      spec('hf-eyebrow-left-' + figure, 'Left eyebrow', 'Left', figure, g, { type: 'headZone', ref: headRef, zone: 'eyebrowLeft' }),
      spec('hf-eyebrow-right-' + figure, 'Right eyebrow', 'Right', figure, g, { type: 'headZone', ref: headRef, zone: 'eyebrowRight' }),
      spec('hf-eye-left-' + figure, 'Left eye', 'Left', figure, g, { type: 'headZone', ref: headRef, zone: 'eyeLeft' }),
      spec('hf-eye-right-' + figure, 'Right eye', 'Right', figure, g, { type: 'headZone', ref: headRef, zone: 'eyeRight' }),
      spec('hf-temple-left-' + figure, 'Left temple', 'Left', figure, g, { type: 'headZone', ref: headRef, zone: 'templeLeft' }),
      spec('hf-temple-right-' + figure, 'Right temple', 'Right', figure, g, { type: 'headZone', ref: headRef, zone: 'templeRight' }),
      spec('hf-ear-left-' + figure, 'Left ear', 'Left', figure, g, { type: 'headZone', ref: headRef, zone: 'earLeft' }),
      spec('hf-ear-right-' + figure, 'Right ear', 'Right', figure, g, { type: 'headZone', ref: headRef, zone: 'earRight' }),
      spec('hf-nose-' + figure, 'Nose', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'nose' }),
      spec('hf-cheek-left-' + figure, 'Left cheek', 'Left', figure, g, { type: 'headZone', ref: headRef, zone: 'cheekLeft' }),
      spec('hf-cheek-right-' + figure, 'Right cheek', 'Right', figure, g, { type: 'headZone', ref: headRef, zone: 'cheekRight' }),
      spec('hf-mouth-' + figure, 'Mouth', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'mouth' }),
      spec('hf-lips-' + figure, 'Lips', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'lips' }),
      spec('hf-chin-' + figure, 'Chin', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'chin' }),
      spec('hf-jaw-left-' + figure, 'Left jaw', 'Left', figure, g, { type: 'headZone', ref: headRef, zone: 'jawLeft' }),
      spec('hf-jaw-right-' + figure, 'Right jaw', 'Right', figure, g, { type: 'headZone', ref: headRef, zone: 'jawRight' }),
    ];
  }

  function headBackDetail(figure, headRef) {
    var g = 'Head & face detail';
    return [
      spec('hb-scalp-' + figure, 'Scalp', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'scalp' }),
      spec('hb-occiput-' + figure, 'Occiput', 'Centre', figure, g, { type: 'headZone', ref: headRef, zone: 'occiput' }),
    ];
  }

  /** Every dual-view (front/back) markable region with geometry rule */
  var DUAL_REGION_SPECS = [];

  (function buildDualCatalog() {
    var front = 'front';
    var back = 'back';

    /* —— Head & neck —— */
    DUAL_REGION_SPECS.push(
      spec('head-front', 'Head', 'Centre', front, 'Head & neck', { type: 'path', ref: 'head-front', expand: { x: 0.42, y: 0.38 } }),
      spec('head-back', 'Head', 'Centre', back, 'Head & neck', { type: 'path', ref: 'head-back', expand: { x: 0.42, y: 0.38 } }),
      spec('neck-front', 'Neck', 'Centre', front, 'Head & neck', { type: 'path', ref: 'neck-front', expand: { x: 0.28, y: 0.32 } }),
      spec('neck-back', 'Neck', 'Centre', back, 'Head & neck', { type: 'path', ref: 'neck-back', expand: { x: 0.28, y: 0.32 } })
    );
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, headFaceDetail(front, 'head-front'));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, headBackDetail(back, 'head-back'));

    /* —— Shoulders (split from upper-arm anchor) —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'shoulder-front', 'Shoulder', front, 'Upper limb',
      { type: 'shoulder', arm: 'left-arm-upper-front', neck: 'neck-front' },
      { type: 'shoulder', arm: 'right-arm-upper-front', neck: 'neck-front' }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'shoulder-back', 'Shoulder', back, 'Upper limb',
      { type: 'shoulder', arm: 'left-arm-upper-back', neck: 'neck-back' },
      { type: 'shoulder', arm: 'right-arm-upper-back', neck: 'neck-back' }
    ));

    /* —— Upper arms —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'arm-upper-front', 'Upper arm', front, 'Upper limb',
      { type: 'path', ref: 'left-arm-upper-front', expand: { x: 0.12, y: 0.1 } },
      { type: 'path', ref: 'right-arm-upper-front', expand: { x: 0.12, y: 0.1 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'arm-upper-back', 'Upper arm', back, 'Upper limb',
      { type: 'path', ref: 'left-arm-upper-back', expand: { x: 0.12, y: 0.1 } },
      { type: 'path', ref: 'right-arm-upper-back', expand: { x: 0.12, y: 0.1 } }
    ));

    /* —— Elbows —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'elbow-front', 'Elbow', front, 'Upper limb',
      { type: 'joint', upper: 'left-arm-upper-front', lower: 'left-arm-lower-front', pad: 16 },
      { type: 'joint', upper: 'right-arm-upper-front', lower: 'right-arm-lower-front', pad: 16 }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'elbow-back', 'Elbow', back, 'Upper limb',
      { type: 'path', ref: 'left-elbow-back', expand: { x: 0.45, y: 0.45 } },
      { type: 'path', ref: 'right-elbow-back', expand: { x: 0.45, y: 0.45 } }
    ));

    /* —— Forearms —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'arm-lower-front', 'Forearm', front, 'Upper limb',
      { type: 'path', ref: 'left-arm-lower-front', expand: { x: 0.12, y: 0.1 } },
      { type: 'path', ref: 'right-arm-lower-front', expand: { x: 0.12, y: 0.1 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'arm-lower-back', 'Forearm', back, 'Upper limb',
      { type: 'path', ref: 'left-arm-lower-back', expand: { x: 0.12, y: 0.1 } },
      { type: 'path', ref: 'right-arm-lower-back', expand: { x: 0.12, y: 0.1 } }
    ));

    /* —— Wrists (between forearm and hand) —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'wrist-front', 'Wrist', front, 'Upper limb',
      { type: 'joint', upper: 'left-arm-lower-front', lower: 'left-palm', pad: 12 },
      { type: 'joint', upper: 'right-arm-lower-front', lower: 'right-palm', pad: 12 }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'wrist-back', 'Wrist', back, 'Upper limb',
      { type: 'joint', upper: 'left-arm-lower-back', lower: 'left-hand-back', pad: 12 },
      { type: 'joint', upper: 'right-arm-lower-back', lower: 'right-hand-back', pad: 12 }
    ));

    /* —— Hands & fingers (native layer1 ids) —— */
    DUAL_REGION_SPECS.push(
      spec('left-palm', 'Hand', 'Left', front, 'Upper limb', { type: 'path', ref: 'left-palm', expand: { x: 0.22, y: 0.22 } }),
      spec('right-palm', 'Hand', 'Right', front, 'Upper limb', { type: 'path', ref: 'right-palm', expand: { x: 0.22, y: 0.22 } }),
      spec('left-hand-back', 'Hand', 'Left', back, 'Upper limb', { type: 'path', ref: 'left-hand-back', expand: { x: 0.22, y: 0.22 } }),
      spec('right-hand-back', 'Hand', 'Right', back, 'Upper limb', { type: 'path', ref: 'right-hand-back', expand: { x: 0.22, y: 0.22 } }),
      spec('left-fingers-front', 'Fingers', 'Left', front, 'Upper limb', { type: 'path', ref: 'left-fingers-front', expand: { x: 0.25, y: 0.25 } }),
      spec('right-fingers-front', 'Fingers', 'Right', front, 'Upper limb', { type: 'path', ref: 'right-fingers-front', expand: { x: 0.25, y: 0.25 } }),
      spec('left-fingers-back', 'Fingers', 'Left', back, 'Upper limb', { type: 'path', ref: 'left-fingers-back', expand: { x: 0.25, y: 0.25 } }),
      spec('right-fingers-back', 'Fingers', 'Right', back, 'Upper limb', { type: 'path', ref: 'right-fingers-back', expand: { x: 0.25, y: 0.25 } })
    );

    /* —— Trunk front —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, trunkSplit('chest', 'Chest', front, 'Trunk — front', 'chest'));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, trunkSplit('abdomen', 'Abdomen', front, 'Trunk — front', 'abdomen'));
    DUAL_REGION_SPECS.push(
      spec('groin', 'Pelvis / groin', 'Centre', front, 'Trunk — front', { type: 'path', ref: 'groin', expand: { x: 0.2, y: 0.25 } })
    );

    /* —— Trunk back —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, trunkSplit('back-upper', 'Upper back', back, 'Trunk — back', 'back-upper'));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, trunkSplit('back-lower', 'Lower back', back, 'Trunk — back', 'back-lower'));
    DUAL_REGION_SPECS.push(
      spec('sacrum', 'Sacrum', 'Centre', back, 'Trunk — back', { type: 'path', ref: 'sacrum', expand: { x: 0.25, y: 0.3 } })
    );
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'buttock', 'Buttock', back, 'Trunk — back',
      { type: 'splitLR', ref: 'buttocks', zone: 'left' },
      { type: 'splitLR', ref: 'buttocks', zone: 'right' }
    ));

    /* —— Hips —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'hip-front', 'Hip', front, 'Lower limb',
      { type: 'path', ref: 'left-hip-front', expand: { x: 0.2, y: 0.2 } },
      { type: 'path', ref: 'right-hip-front', expand: { x: 0.2, y: 0.2 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'hip-back', 'Hip', back, 'Lower limb',
      { type: 'path', ref: 'left-hip-back', expand: { x: 0.2, y: 0.2 } },
      { type: 'path', ref: 'right-hip-back', expand: { x: 0.2, y: 0.2 } }
    ));

    /* —— Thighs —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'leg-upper-front', 'Thigh', front, 'Lower limb',
      { type: 'path', ref: 'left-leg-upper-front', expand: { x: 0.12, y: 0.1 } },
      { type: 'path', ref: 'right-leg-upper-front', expand: { x: 0.12, y: 0.1 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'leg-upper-back', 'Thigh', back, 'Lower limb',
      { type: 'path', ref: 'left-leg-upper-back', expand: { x: 0.12, y: 0.1 } },
      { type: 'path', ref: 'right-leg-upper-back', expand: { x: 0.12, y: 0.1 } }
    ));

    /* —— Knees —— */
    DUAL_REGION_SPECS.push(
      spec('left-knee', 'Knee', 'Left', front, 'Lower limb', { type: 'path', ref: 'left-knee', expand: { x: 0.35, y: 0.35 } }),
      spec('right-knee', 'Knee', 'Right', front, 'Lower limb', { type: 'path', ref: 'right-knee', expand: { x: 0.35, y: 0.35 } })
    );
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'knee-back', 'Knee', back, 'Lower limb',
      { type: 'joint', upper: 'left-leg-upper-back', lower: 'left-leg-lower-back', pad: 14 },
      { type: 'joint', upper: 'right-leg-upper-back', lower: 'right-leg-lower-back', pad: 14 }
    ));

    /* —— Lower leg / calf —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'leg-lower-front', 'Lower leg / shin', front, 'Lower limb',
      { type: 'path', ref: 'left-leg-lower-front', expand: { x: 0.1, y: 0.08 } },
      { type: 'path', ref: 'right-leg-lower-front', expand: { x: 0.1, y: 0.08 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'leg-lower-back', 'Calf', back, 'Lower limb',
      { type: 'path', ref: 'left-leg-lower-back', expand: { x: 0.1, y: 0.08 } },
      { type: 'path', ref: 'right-leg-lower-back', expand: { x: 0.1, y: 0.08 } }
    ));

    /* —— Ankles —— */
    DUAL_REGION_SPECS.push(
      spec('left-ankle', 'Ankle', 'Left', front, 'Lower limb', { type: 'path', ref: 'left-ankle', expand: { x: 0.35, y: 0.35 } }),
      spec('right-ankle', 'Ankle', 'Right', front, 'Lower limb', { type: 'path', ref: 'right-ankle', expand: { x: 0.35, y: 0.35 } })
    );
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'ankle-back', 'Ankle', back, 'Lower limb',
      { type: 'joint', upper: 'left-leg-lower-back', lower: 'left-foot-back', pad: 12 },
      { type: 'joint', upper: 'right-leg-lower-back', lower: 'right-foot-back', pad: 12 }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'achilles', 'Achilles', back, 'Lower limb',
      { type: 'joint', upper: 'left-leg-lower-back', lower: 'left-heel', pad: 10 },
      { type: 'joint', upper: 'right-leg-lower-back', lower: 'right-heel', pad: 10 }
    ));

    /* —— Feet & toes —— */
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'foot-front', 'Foot', front, 'Lower limb',
      { type: 'path', ref: 'left-foot-front', expand: { x: 0.15, y: 0.15 } },
      { type: 'path', ref: 'right-foot-front', expand: { x: 0.15, y: 0.15 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'foot-back', 'Foot', back, 'Lower limb',
      { type: 'path', ref: 'left-foot-back', expand: { x: 0.15, y: 0.15 } },
      { type: 'path', ref: 'right-foot-back', expand: { x: 0.15, y: 0.15 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'heel', 'Heel', back, 'Lower limb',
      { type: 'path', ref: 'left-heel', expand: { x: 0.2, y: 0.2 } },
      { type: 'path', ref: 'right-heel', expand: { x: 0.2, y: 0.2 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'toes-front', 'Toes', front, 'Lower limb',
      { type: 'path', ref: 'left-toes-front', expand: { x: 0.25, y: 0.25 } },
      { type: 'path', ref: 'right-toes-front', expand: { x: 0.25, y: 0.25 } }
    ));
    DUAL_REGION_SPECS.push.apply(DUAL_REGION_SPECS, limbPair(
      'toes-back', 'Toes', back, 'Lower limb',
      { type: 'path', ref: 'left-toes-back', expand: { x: 0.25, y: 0.25 } },
      { type: 'path', ref: 'right-toes-back', expand: { x: 0.25, y: 0.25 } }
    ));
  })();

  /* —— Zoom views (inline SVG paths) —— */
  function zoomRegion(id, part, side, figure, group, subgroup, cx, cy, path) {
    return { id: id, part: part, side: side, figure: figure, group: group, subgroup: subgroup, cx: cx, cy: cy, path: path, viewKey: figure };
  }

  var FACE_REGIONS = [
    zoomRegion('fc_forehead', 'Forehead', 'Centre', 'face', 'Head & neck', 'Face — forehead & temples', 50, 24, 'M60,34 Q100,26 140,34 L138,62 Q100,56 62,62 Z'),
    zoomRegion('fc_temple_l', 'Left temple', 'Left', 'face', 'Head & neck', 'Face — forehead & temples', 28, 34, 'M48,56 L62,52 L62,84 L50,88 Z'),
    zoomRegion('fc_temple_r', 'Right temple', 'Right', 'face', 'Head & neck', 'Face — forehead & temples', 72, 34, 'M138,52 L152,56 L150,88 L138,84 Z'),
    zoomRegion('fc_eyebrow_l', 'Left eyebrow', 'Left', 'face', 'Head & neck', 'Face — eyes & brows', 38, 40, 'M60,76 Q76,67 92,76 L92,84 Q76,76 60,84 Z'),
    zoomRegion('fc_eyebrow_r', 'Right eyebrow', 'Right', 'face', 'Head & neck', 'Face — eyes & brows', 62, 40, 'M108,76 Q124,67 140,76 L140,84 Q124,76 108,84 Z'),
    zoomRegion('fc_eye_l', 'Left eye', 'Left', 'face', 'Head & neck', 'Face — eyes & brows', 39, 47, 'M62,90 Q78,82 94,90 Q78,101 62,90 Z'),
    zoomRegion('fc_eye_r', 'Right eye', 'Right', 'face', 'Head & neck', 'Face — eyes & brows', 61, 47, 'M106,90 Q122,82 138,90 Q122,101 106,90 Z'),
    zoomRegion('fc_ear_l', 'Left ear', 'Left', 'face', 'Head & neck', 'Face — ears', 22, 52, 'M46,86 Q33,90 38,109 Q43,121 53,116 L53,90 Z'),
    zoomRegion('fc_ear_r', 'Right ear', 'Right', 'face', 'Head & neck', 'Face — ears', 78, 52, 'M154,86 Q167,90 162,109 Q157,121 147,116 L147,90 Z'),
    zoomRegion('fc_nose', 'Nose', 'Centre', 'face', 'Head & neck', 'Face — nose & mouth', 50, 56, 'M94,98 L90,122 Q100,129 110,122 L106,98 Z'),
    zoomRegion('fc_cheek_l', 'Left cheek', 'Left', 'face', 'Head & neck', 'Face — cheeks & jaw', 34, 58, 'M58,104 Q72,100 84,107 L82,128 Q68,128 56,121 Z'),
    zoomRegion('fc_cheek_r', 'Right cheek', 'Right', 'face', 'Head & neck', 'Face — cheeks & jaw', 66, 58, 'M116,107 Q128,100 142,104 L144,121 Q132,128 118,128 Z'),
    zoomRegion('fc_mouth', 'Mouth', 'Centre', 'face', 'Head & neck', 'Face — nose & mouth', 50, 70, 'M82,138 Q100,131 118,138 Q100,151 82,138 Z'),
    zoomRegion('fc_lips', 'Lips', 'Centre', 'face', 'Head & neck', 'Face — nose & mouth', 50, 71, 'M84,139 Q100,134 116,139 Q100,148 84,139 Z'),
    zoomRegion('fc_chin', 'Chin', 'Centre', 'face', 'Head & neck', 'Face — cheeks & jaw', 50, 83, 'M80,152 Q100,148 120,152 Q116,176 100,178 Q84,176 80,152 Z'),
    zoomRegion('fc_jaw_l', 'Left jaw', 'Left', 'face', 'Head & neck', 'Face — cheeks & jaw', 34, 73, 'M58,128 Q66,150 82,161 L78,140 Q66,134 58,128 Z'),
    zoomRegion('fc_jaw_r', 'Right jaw', 'Right', 'face', 'Head & neck', 'Face — cheeks & jaw', 66, 73, 'M142,128 Q134,150 118,161 L122,140 Q134,134 142,128 Z'),
  ];

  var HAND_L_REGIONS = [
    zoomRegion('hl_wrist', 'Wrist', 'Left', 'hand_l', 'Upper limb', 'Hand — wrist & palm', 51, 90, 'M62,166 L122,166 L124,192 L60,192 Z'),
    zoomRegion('hl_palm', 'Palm', 'Left', 'hand_l', 'Upper limb', 'Hand — wrist & palm', 50, 70, 'M54,116 L126,116 L124,165 L60,165 Z'),
    zoomRegion('hl_knuckle', 'Knuckle', 'Left', 'hand_l', 'Upper limb', 'Hand — wrist & palm', 50, 56, 'M54,103 L126,103 L126,116 L54,116 Z'),
    zoomRegion('hl_thumb', 'Thumb', 'Left', 'hand_l', 'Upper limb', 'Hand — thumb', 21, 58, 'M27,94 L55,114 L46,135 L25,113 Z'),
    zoomRegion('hl_index', 'Index finger', 'Left', 'hand_l', 'Upper limb', 'Hand — fingers', 34, 39, 'M54,42 L71,42 L71,114 L56,114 Z'),
    zoomRegion('hl_middle', 'Middle finger', 'Left', 'hand_l', 'Upper limb', 'Hand — fingers', 44, 36, 'M72,30 L88,30 L88,114 L72,114 Z'),
    zoomRegion('hl_ring', 'Ring finger', 'Left', 'hand_l', 'Upper limb', 'Hand — fingers', 54, 38, 'M90,34 L106,34 L106,115 L90,115 Z'),
    zoomRegion('hl_little', 'Little finger', 'Left', 'hand_l', 'Upper limb', 'Hand — fingers', 64, 43, 'M108,50 L124,50 L126,117 L108,116 Z'),
  ];

  var HAND_R_REGIONS = HAND_L_REGIONS.map(function (r) {
    return zoomRegion(r.id.replace('hl_', 'hr_'), r.part, 'Right', 'hand_r', r.group, r.subgroup, 100 - r.cx, r.cy, r.path);
  });

  var FOOT_L_REGIONS = [
    zoomRegion('fl_ankle', 'Ankle', 'Left', 'foot_l', 'Lower limb', 'Foot — ankle & heel', 50, 14, 'M84,16 L116,16 L118,42 L82,42 Z'),
    zoomRegion('fl_heel', 'Heel', 'Left', 'foot_l', 'Lower limb', 'Foot — ankle & heel', 50, 30, 'M76,44 Q100,38 124,44 L122,80 Q100,86 78,80 Z'),
    zoomRegion('fl_arch', 'Arch', 'Left', 'foot_l', 'Lower limb', 'Foot — sole', 50, 50, 'M72,84 L128,84 L126,116 L74,116 Z'),
    zoomRegion('fl_ball', 'Ball of foot', 'Left', 'foot_l', 'Lower limb', 'Foot — sole', 50, 65, 'M70,118 L130,118 L130,150 L70,150 Z'),
    zoomRegion('fl_bigtoe', 'Big toe', 'Left', 'foot_l', 'Lower limb', 'Foot — toes', 38, 84, 'M64,154 Q76,150 88,154 L86,182 Q76,187 66,182 Z'),
    zoomRegion('fl_toe2', 'Second toe', 'Left', 'foot_l', 'Lower limb', 'Foot — toes', 47, 85, 'M88,156 L100,156 L100,183 L88,183 Z'),
    zoomRegion('fl_toe3', 'Third toe', 'Left', 'foot_l', 'Lower limb', 'Foot — toes', 53, 85, 'M101,156 L112,156 L112,183 L101,183 Z'),
    zoomRegion('fl_toe4', 'Fourth toe', 'Left', 'foot_l', 'Lower limb', 'Foot — toes', 59, 83, 'M113,155 L124,154 L125,181 L113,181 Z'),
    zoomRegion('fl_littletoe', 'Little toe', 'Left', 'foot_l', 'Lower limb', 'Foot — toes', 64, 80, 'M125,152 L135,151 L137,176 L126,179 Z'),
    zoomRegion('fl_toes', 'Toes', 'Left', 'foot_l', 'Lower limb', 'Foot — toes', 50, 84, 'M62,152 L138,150 L139,186 L64,186 Z'),
  ];

  var FOOT_R_REGIONS = FOOT_L_REGIONS.map(function (r) {
    return zoomRegion(r.id.replace('fl_', 'fr_'), r.part, 'Right', 'foot_r', r.group, r.subgroup, 100 - r.cx, r.cy, r.path);
  });

  var HEAD_BACK_REGIONS = [
    zoomRegion('hb_scalp', 'Scalp', 'Centre', 'head_back', 'Head & neck', 'Head — back', 50, 22, 'M62,28 Q100,18 138,28 L132,58 Q100,48 68,58 Z'),
    zoomRegion('hb_occiput', 'Occiput', 'Centre', 'head_back', 'Head & neck', 'Head — back', 50, 38, 'M72,58 Q100,50 128,58 L124,88 Q100,82 76,88 Z'),
    zoomRegion('hb_neck_l', 'Neck', 'Left', 'head_back', 'Head & neck', 'Neck', 36, 58, 'M68,88 L88,86 L90,118 L72,120 Z'),
    zoomRegion('hb_neck_c', 'Neck', 'Centre', 'head_back', 'Head & neck', 'Neck', 50, 58, 'M88,86 L112,86 L110,122 L90,122 Z'),
    zoomRegion('hb_neck_r', 'Neck', 'Right', 'head_back', 'Head & neck', 'Neck', 64, 58, 'M112,86 L132,88 L130,120 L110,118 Z'),
  ];

  var CHEST_REGIONS = [
    zoomRegion('ch_shoulder_l', 'Shoulder', 'Left', 'chest', 'Upper limb', 'Chest — shoulders', 78, 35,
      'M146,36 C158,38 170,46 176,58 C180,68 178,80 172,90 C164,84 154,76 146,70 C140,64 136,54 136,44 Z'),
    zoomRegion('ch_shoulder_r', 'Shoulder', 'Right', 'chest', 'Upper limb', 'Chest — shoulders', 22, 35,
      'M54,36 C42,38 30,46 24,58 C20,68 22,80 28,90 C36,84 46,76 54,70 C60,64 64,54 64,44 Z'),
    zoomRegion('ch_chest_l', 'Chest', 'Left', 'chest', 'Trunk — front', 'Chest', 68, 52,
      'M118,32 C126,36 132,42 136,50 C140,60 140,72 136,82 C130,90 120,94 110,94 C104,94 100,92 100,92 L100,38 C106,34 112,32 118,32 Z'),
    zoomRegion('ch_chest_c', 'Chest', 'Centre', 'chest', 'Trunk — front', 'Chest', 50, 52,
      'M96,34 L104,34 L104,90 L96,90 Z'),
    zoomRegion('ch_chest_r', 'Chest', 'Right', 'chest', 'Trunk — front', 'Chest', 32, 52,
      'M82,32 C74,36 68,42 64,50 C60,60 60,72 64,82 C70,90 80,94 90,94 C96,94 100,92 100,92 L100,38 C94,34 88,32 82,32 Z'),
  ];

  var ABDOMEN_REGIONS = [
    zoomRegion('ab_abd_l', 'Abdomen', 'Left', 'abdomen', 'Trunk — front', 'Abdomen', 34, 48, 'M56,118 L88,116 L86,158 L54,156 Z'),
    zoomRegion('ab_abd_c', 'Abdomen', 'Centre', 'abdomen', 'Trunk — front', 'Abdomen', 50, 48, 'M88,116 L112,116 L110,158 L90,158 Z'),
    zoomRegion('ab_abd_r', 'Abdomen', 'Right', 'abdomen', 'Trunk — front', 'Abdomen', 66, 48, 'M112,116 L144,118 L146,156 L114,158 Z'),
    zoomRegion('ab_groin', 'Pelvis / groin', 'Centre', 'abdomen', 'Trunk — front', 'Pelvis / groin', 50, 68, 'M72,158 Q100,152 128,158 Q124,182 100,186 Q76,182 72,158 Z'),
  ];

  var BACK_REGIONS = [
    zoomRegion('bk_upper_l', 'Upper back', 'Left', 'torso_back', 'Trunk — back', 'Upper back', 34, 28, 'M58,38 L88,36 L86,78 L56,76 Z'),
    zoomRegion('bk_upper_c', 'Upper back', 'Centre', 'torso_back', 'Trunk — back', 'Upper back', 50, 28, 'M88,36 L112,36 L110,78 L90,78 Z'),
    zoomRegion('bk_upper_r', 'Upper back', 'Right', 'torso_back', 'Trunk — back', 'Upper back', 66, 28, 'M112,36 L142,38 L144,76 L114,78 Z'),
    zoomRegion('bk_lower_l', 'Lower back', 'Left', 'torso_back', 'Trunk — back', 'Lower back', 34, 48, 'M56,76 L88,74 L86,118 L54,116 Z'),
    zoomRegion('bk_lower_c', 'Lower back', 'Centre', 'torso_back', 'Trunk — back', 'Lower back', 50, 48, 'M88,74 L112,74 L110,118 L90,118 Z'),
    zoomRegion('bk_lower_r', 'Lower back', 'Right', 'torso_back', 'Trunk — back', 'Lower back', 66, 48, 'M112,74 L144,76 L146,116 L114,118 Z'),
    zoomRegion('bk_sacrum', 'Sacrum', 'Centre', 'torso_back', 'Trunk — back', 'Sacrum', 50, 58, 'M82,118 Q100,112 118,118 Q114,138 100,142 Q86,138 82,118 Z'),
    zoomRegion('bk_buttock_l', 'Buttock', 'Left', 'torso_back', 'Trunk — back', 'Buttocks', 32, 72, 'M54,116 L82,114 L80,158 L52,156 Z'),
    zoomRegion('bk_buttock_r', 'Buttock', 'Right', 'torso_back', 'Trunk — back', 'Buttocks', 68, 72, 'M118,114 L146,116 L148,156 L120,158 Z'),
  ];

  var ARM_L_REGIONS = [
    zoomRegion('al_shoulder', 'Shoulder', 'Left', 'arm_l', 'Upper limb', 'Arm — shoulder', 50, 14, 'M72,18 L108,18 L112,48 L68,48 Z'),
    zoomRegion('al_upper', 'Upper arm', 'Left', 'arm_l', 'Upper limb', 'Arm — upper arm', 50, 32, 'M70,48 L110,48 L108,88 L72,88 Z'),
    zoomRegion('al_elbow', 'Elbow', 'Left', 'arm_l', 'Upper limb', 'Arm — elbow', 50, 48, 'M72,88 L108,88 L106,108 L74,108 Z'),
    zoomRegion('al_forearm', 'Forearm', 'Left', 'arm_l', 'Upper limb', 'Arm — forearm', 50, 62, 'M74,108 L106,108 L104,168 L76,168 Z'),
    zoomRegion('al_wrist', 'Wrist', 'Left', 'arm_l', 'Upper limb', 'Arm — wrist', 50, 78, 'M76,168 L104,168 L102,188 L78,188 Z'),
  ];

  var ARM_R_REGIONS = ARM_L_REGIONS.map(function (r) {
    return zoomRegion(r.id.replace('al_', 'ar_'), r.part, 'Right', 'arm_r', r.group, r.subgroup, 100 - r.cx, r.cy, r.path);
  });

  var LEG_L_REGIONS = [
    zoomRegion('ll_hip', 'Hip', 'Left', 'leg_l', 'Lower limb', 'Leg — hip & thigh', 50, 12, 'M72,16 L128,16 L126,42 L74,42 Z'),
    zoomRegion('ll_thigh', 'Thigh', 'Left', 'leg_l', 'Lower limb', 'Leg — hip & thigh', 50, 28, 'M74,42 L126,42 L124,88 L76,88 Z'),
    zoomRegion('ll_knee', 'Knee', 'Left', 'leg_l', 'Lower limb', 'Leg — knee', 50, 48, 'M76,88 L124,88 L122,108 L78,108 Z'),
    zoomRegion('ll_shin', 'Lower leg / shin', 'Left', 'leg_l', 'Lower limb', 'Leg — lower leg', 50, 62, 'M78,108 L122,108 L120,158 L80,158 Z'),
    zoomRegion('ll_calf', 'Calf', 'Left', 'leg_l', 'Lower limb', 'Leg — lower leg', 48, 68, 'M76,118 L82,118 L80,158 L74,158 Z'),
    zoomRegion('ll_ankle', 'Ankle', 'Left', 'leg_l', 'Lower limb', 'Leg — ankle', 50, 82, 'M80,158 L120,158 L118,178 L82,178 Z'),
  ];

  var LEG_R_REGIONS = LEG_L_REGIONS.map(function (r) {
    return zoomRegion(r.id.replace('ll_', 'lr_'), r.part, 'Right', 'leg_r', r.group, r.subgroup, 100 - r.cx, r.cy, r.path);
  });

  var ZOOM_VIEWS = {
    face: { label: 'Face', vb: '0 0 200 200', w: 200, h: 200, regions: FACE_REGIONS },
    head_back: { label: 'Head (back)', vb: '0 0 200 200', w: 200, h: 200, regions: HEAD_BACK_REGIONS },
    chest: { label: 'Chest', vb: '0 0 200 140', w: 200, h: 140, regions: CHEST_REGIONS },
    abdomen: { label: 'Abdomen', vb: '0 0 200 220', w: 200, h: 220, regions: ABDOMEN_REGIONS },
    torso_back: { label: 'Back', vb: '0 0 200 240', w: 200, h: 240, regions: BACK_REGIONS },
    arm_l: { label: 'Left arm', vb: '0 0 120 200', w: 120, h: 200, regions: ARM_L_REGIONS },
    arm_r: { label: 'Right arm', vb: '0 0 120 200', w: 120, h: 200, regions: ARM_R_REGIONS },
    leg_l: { label: 'Left leg', vb: '0 0 120 200', w: 120, h: 200, regions: LEG_L_REGIONS },
    leg_r: { label: 'Right leg', vb: '0 0 120 200', w: 120, h: 200, regions: LEG_R_REGIONS },
    hand_l: { label: 'Left hand', vb: '0 0 180 200', w: 180, h: 200, regions: HAND_L_REGIONS },
    hand_r: { label: 'Right hand', vb: '0 0 180 200', w: 180, h: 200, regions: HAND_R_REGIONS, mirrorOf: 'hand_l' },
    foot_l: { label: 'Left foot', vb: '0 0 200 200', w: 200, h: 200, regions: FOOT_L_REGIONS },
    foot_r: { label: 'Right foot', vb: '0 0 200 200', w: 200, h: 200, regions: FOOT_R_REGIONS, mirrorOf: 'foot_l' },
  };

  /** Detailed clinical illustrations for zoom tabs (face / hands / feet).
   *  Each art block: skin outline (filled), interior detail strokes, and shapes. */
  var ZOOM_ART = {
    face: {
      // Head + neck silhouette
      outline: 'M100,20 C126,20 148,38 154,68 C158,86 156,104 150,122 ' +
        'C145,140 132,160 118,170 C118,178 119,184 122,190 L78,190 ' +
        'C81,184 82,178 82,170 C68,160 55,140 50,122 C44,104 42,86 46,68 ' +
        'C52,38 74,20 100,20 Z',
      // Ears
      shapes: [
        { type: 'path', d: 'M50,88 C38,86 34,100 39,112 C42,120 50,121 55,116 L53,90 Z', fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'path', d: 'M150,88 C162,86 166,100 161,112 C158,120 150,121 145,116 L147,90 Z', fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        // Hair line
        { type: 'path', d: 'M52,72 C58,42 78,28 100,28 C122,28 142,42 148,72 C140,58 122,50 100,50 C78,50 60,58 52,72 Z', fill: '#cbd5e1', stroke: 'none', sw: 0 },
        // Eyes (whites + iris)
        { type: 'ellipse', cx: 78, cy: 91, rx: 12, ry: 6, fill: '#ffffff', stroke: '#0e0f0e', sw: 1.5 },
        { type: 'ellipse', cx: 122, cy: 91, rx: 12, ry: 6, fill: '#ffffff', stroke: '#0e0f0e', sw: 1.5 },
        { type: 'ellipse', cx: 78, cy: 91, rx: 4, ry: 4, fill: '#334155', stroke: 'none', sw: 0 },
        { type: 'ellipse', cx: 122, cy: 91, rx: 4, ry: 4, fill: '#334155', stroke: 'none', sw: 0 },
      ],
      // Brows, nose, lips
      details: [
        { d: 'M64,80 Q78,72 92,80', sw: 2.5 },
        { d: 'M108,80 Q122,72 136,80', sw: 2.5 },
        { d: 'M100,96 L95,120 Q100,125 105,120', sw: 2 },
        { d: 'M92,120 Q100,126 108,120', sw: 2 },
        { d: 'M84,139 Q100,133 116,139 Q100,150 84,139 Z', sw: 2 },
        { d: 'M84,139 Q100,143 116,139', sw: 1.5 },
      ],
    },
    /** Chest art from realistic_human_anatomy_map.html (anterior, y shifted −118 for close-up crop). */
    chest: {
      realistic: true,
      shapes: [
        { type: 'path', d: 'M84,4 C82,10 80,18 82,26 C86,30 92,32 100,32 C108,32 114,30 118,26 C120,18 118,10 116,4 C110,0 90,0 84,4 Z', fill: '#f0b890', stroke: '#7a4a28', sw: 1 },
        { type: 'path', d: 'M90,6 C88,14 88,24 90,30', fill: 'none', stroke: '#c89070', sw: 0.7 },
        { type: 'path', d: 'M110,6 C112,14 112,24 110,30', fill: 'none', stroke: '#c89070', sw: 0.7 },
        { type: 'path', d: 'M82,32 C76,30 66,30 54,36', fill: 'none', stroke: '#6a8aaa', sw: 1.2 },
        { type: 'path', d: 'M118,32 C124,30 134,30 146,36', fill: 'none', stroke: '#6a8aaa', sw: 1.2 },
        { type: 'path', d: 'M54,36 C42,38 30,46 24,58 C20,68 22,80 28,90 C36,84 46,76 54,70 C60,64 64,54 64,44 Z', fill: '#aac8e8', stroke: '#3a6898', sw: 1 },
        { type: 'path', d: 'M146,36 C158,38 170,46 176,58 C180,68 178,80 172,90 C164,84 154,76 146,70 C140,64 136,54 136,44 Z', fill: '#aac8e8', stroke: '#3a6898', sw: 1 },
        { type: 'path', d: 'M82,32 C74,36 68,42 64,50 C60,60 60,72 64,82 C70,90 80,94 90,94 C96,94 100,92 100,92 L100,38 C94,34 88,32 82,32 Z', fill: '#b8d8f2', stroke: '#3a6898', sw: 1 },
        { type: 'path', d: 'M118,32 C126,36 132,42 136,50 C140,60 140,72 136,82 C130,90 120,94 110,94 C104,94 100,92 100,92 L100,38 C106,34 112,32 118,32 Z', fill: '#b8d8f2', stroke: '#3a6898', sw: 1 },
        { type: 'path', d: 'M64,82 C60,90 58,98 58,108 C58,114 60,120 64,124 L74,122 C70,114 68,106 70,96 C72,90 70,86 64,82 Z', fill: '#c0dce8', stroke: '#4a7898', sw: 0.9 },
        { type: 'path', d: 'M136,82 C140,90 142,98 142,108 C142,114 140,120 136,124 L126,122 C130,114 132,106 130,96 C128,90 130,86 136,82 Z', fill: '#c0dce8', stroke: '#4a7898', sw: 0.9 },
        { type: 'path', d: 'M90,94 C84,96 78,100 74,106 C70,114 70,126 74,134 L90,136 L100,134 L110,136 L126,134 C130,126 130,114 126,106 C122,100 116,96 110,94 C106,94 100,92 94,94 Z', fill: '#c8e8c0', stroke: '#3a7a3a', sw: 1 },
      ],
      details: [
        { d: 'M100,36 L100,98', sw: 0.8, stroke: '#5a82aa' },
        { d: 'M100,74 L100,92', sw: 0.9, stroke: '#5a9a5a' },
      ],
    },
    head_back: {
      shading: true,
      outline: 'M100,16 C118,16 132,22 142,34 C150,44 154,56 154,68 ' +
        'C154,82 152,96 148,108 C144,122 136,134 126,142 L124,156 ' +
        'C122,166 114,172 100,172 C86,172 78,166 76,156 L74,142 ' +
        'C64,134 56,122 52,108 C48,96 46,82 46,68 C46,56 50,44 58,34 ' +
        'C68,22 82,16 100,16 Z',
      shapes: [
        { type: 'path', d: 'M52,34 C48,48 46,62 48,76 C50,88 56,98 62,104 L58,88 C54,74 54,58 58,44 C60,38 56,34 52,34 Z', fill: '#cbd5e1', stroke: 'none', sw: 0 },
        { type: 'path', d: 'M148,34 C152,48 154,62 152,76 C150,88 144,98 138,104 L142,88 C146,74 146,58 142,44 C140,38 144,34 148,34 Z', fill: '#cbd5e1', stroke: 'none', sw: 0 },
        { type: 'path', d: 'M44,78 C38,74 34,82 36,94 C38,106 46,114 54,112 L52,96 C50,88 48,82 44,78 Z', fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'path', d: 'M156,78 C162,74 166,82 164,94 C162,106 154,114 146,112 L148,96 C150,88 152,82 156,78 Z', fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'path', d: 'M88,58 Q100,52 112,58 Q108,72 100,76 Q92,72 88,58 Z', fill: '#eef2f7', stroke: '#94a3b8', sw: 1 },
        { type: 'path', d: 'M78,152 L122,152 L118,188 L82,188 Z', fill: '#f8fafc', stroke: '#0e0f0e', sw: 2 },
      ],
      details: [
        { d: 'M62,42 Q100,30 138,42 Q132,54 100,50 Q68,54 62,42', sw: 1.8 },
        { d: 'M72,88 Q100,82 128,88', sw: 1.2 },
        { d: 'M76,104 Q100,98 124,104', sw: 1.2 },
        { d: 'M94,118 L100,134 L106,118', sw: 1.5 },
        { d: 'M88,142 L112,142', sw: 1.2 },
        { d: 'M82,162 Q100,168 118,162', sw: 1.5 },
      ],
    },
    hand_l: {
      // Palm-up hand: thumb to the left, four fingers up
      outline: 'M68,192 C63,180 61,167 61,152 C53,150 47,144 43,135 L29,111 ' +
        'C24,102 31,93 39,98 C44,101 49,108 53,116 L57,118 L57,42 ' +
        'C57,33 71,33 71,42 L71,114 L72,114 L72,30 C72,21 88,21 88,30 ' +
        'L88,114 L90,114 L90,34 C90,25 105,25 105,34 L105,116 L107,116 ' +
        'L109,50 C109,41 125,41 125,50 L126,120 C128,150 126,175 120,192 Z',
      shapes: [
        // Finger nails
        { type: 'ellipse', cx: 64, cy: 48, rx: 5, ry: 6, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 80, cy: 36, rx: 5.5, ry: 6.5, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 97, cy: 40, rx: 5.5, ry: 6.5, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 117, cy: 56, rx: 5, ry: 6, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 36, cy: 104, rx: 6, ry: 5, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
      ],
      details: [
        // Finger joint creases
        { d: 'M58,68 L70,68', sw: 1.2 }, { d: 'M58,92 L70,92', sw: 1.2 },
        { d: 'M73,60 L87,60', sw: 1.2 }, { d: 'M73,86 L87,86', sw: 1.2 },
        { d: 'M91,64 L104,64', sw: 1.2 }, { d: 'M91,90 L104,90', sw: 1.2 },
        { d: 'M110,72 L124,72', sw: 1.2 }, { d: 'M110,96 L124,96', sw: 1.2 },
        // Palm creases
        { d: 'M60,128 Q84,120 104,127', sw: 1.5 },
        { d: 'M58,140 Q84,133 112,140', sw: 1.5 },
        { d: 'M62,150 Q72,166 80,178', sw: 1.5 },
      ],
    },
    foot_l: {
      // Plantar (sole) view: narrow heel (top), wider ball, arch on medial (left) side
      outline: 'M100,14 C110,14 117,24 118,40 C120,58 119,76 118,94 ' +
        'C118,112 121,128 127,140 C129,147 125,152 116,152 L84,152 ' +
        'C75,152 71,147 73,139 C67,126 65,118 66,102 C67,84 70,66 73,50 ' +
        'C76,30 86,14 100,14 Z',
      shapes: [
        // Toe pads (big -> little)
        { type: 'ellipse', cx: 76, cy: 167, rx: 11, ry: 14, fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'ellipse', cx: 93, cy: 170, rx: 7.5, ry: 11, fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'ellipse', cx: 106, cy: 170, rx: 7, ry: 10.5, fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'ellipse', cx: 118, cy: 166, rx: 6.5, ry: 9.5, fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        { type: 'ellipse', cx: 128, cy: 160, rx: 5.5, ry: 8, fill: '#f1f5f9', stroke: '#0e0f0e', sw: 2 },
        // Toenails
        { type: 'ellipse', cx: 76, cy: 162, rx: 5.5, ry: 5.5, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 93, cy: 167, rx: 3.8, ry: 3.8, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 106, cy: 167, rx: 3.6, ry: 3.6, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 118, cy: 163, rx: 3.2, ry: 3.2, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
        { type: 'ellipse', cx: 128, cy: 158, rx: 2.8, ry: 2.8, fill: '#e2e8f0', stroke: '#94a3b8', sw: 1 },
      ],
      details: [
        // Ball pad + arch contour
        { d: 'M74,118 Q100,130 124,116', sw: 1.5 },
        { d: 'M70,104 Q82,108 92,104', sw: 1.2 },
        { d: 'M96,40 Q102,92 100,150', sw: 1 },
      ],
    },
  };

  /** Zoom tabs that reuse the main clinical diagram (assets/new.svg) cropped to the body area. */
  var ZOOM_DIAGRAM_VIEW_KEYS = ['abdomen', 'torso_back', 'arm_l', 'arm_r', 'leg_l', 'leg_r'];

  var ZOOM_CROP_WIRES = {
    abdomen: ['abdomen', 'groin', 'left-hip-front', 'right-hip-front'],
    torso_back: ['back-upper', 'back-lower', 'buttocks', 'sacrum', 'neck-back'],
    arm_l: ['left-arm-upper-front', 'left-arm-lower-front', 'left-palm'],
    arm_r: ['right-arm-upper-front', 'right-arm-lower-front', 'right-palm'],
    leg_l: ['left-leg-upper-front', 'left-leg-lower-front', 'left-ankle', 'left-hip-front'],
    leg_r: ['right-leg-upper-front', 'right-leg-lower-front', 'right-ankle', 'right-hip-front'],
  };

  var ZOOM_WIRE_BUILDS = {
    abdomen: {
      ab_abd_l: { type: 'splitLR', ref: 'abdomen', zone: 'right' },
      ab_abd_c: { type: 'splitLR', ref: 'abdomen', zone: 'centre' },
      ab_abd_r: { type: 'splitLR', ref: 'abdomen', zone: 'left' },
      ab_groin: { type: 'path', ref: 'groin', expand: { x: 0.12, y: 0.18 } },
    },
    torso_back: {
      bk_upper_l: { type: 'splitLR', ref: 'back-upper', zone: 'left' },
      bk_upper_c: { type: 'splitLR', ref: 'back-upper', zone: 'centre' },
      bk_upper_r: { type: 'splitLR', ref: 'back-upper', zone: 'right' },
      bk_lower_l: { type: 'splitLR', ref: 'back-lower', zone: 'left' },
      bk_lower_c: { type: 'splitLR', ref: 'back-lower', zone: 'centre' },
      bk_lower_r: { type: 'splitLR', ref: 'back-lower', zone: 'right' },
      bk_sacrum: { type: 'path', ref: 'sacrum', expand: { x: 0.2, y: 0.25 } },
      bk_buttock_l: { type: 'splitLR', ref: 'buttocks', zone: 'left' },
      bk_buttock_r: { type: 'splitLR', ref: 'buttocks', zone: 'right' },
    },
    arm_l: {
      al_shoulder: { type: 'shoulder', arm: 'left-arm-upper-front', neck: 'neck-front' },
      al_upper: { type: 'path', ref: 'left-arm-upper-front', expand: { x: 0.1, y: 0.08 } },
      al_elbow: { type: 'joint', upper: 'left-arm-upper-front', lower: 'left-arm-lower-front', pad: 14 },
      al_forearm: { type: 'path', ref: 'left-arm-lower-front', expand: { x: 0.1, y: 0.08 } },
      al_wrist: { type: 'joint', upper: 'left-arm-lower-front', lower: 'left-palm', pad: 10 },
    },
    arm_r: {
      al_shoulder: { type: 'shoulder', arm: 'right-arm-upper-front', neck: 'neck-front' },
      al_upper: { type: 'path', ref: 'right-arm-upper-front', expand: { x: 0.1, y: 0.08 } },
      al_elbow: { type: 'joint', upper: 'right-arm-upper-front', lower: 'right-arm-lower-front', pad: 14 },
      al_forearm: { type: 'path', ref: 'right-arm-lower-front', expand: { x: 0.1, y: 0.08 } },
      al_wrist: { type: 'joint', upper: 'right-arm-lower-front', lower: 'right-palm', pad: 10 },
    },
    leg_l: {
      ll_hip: { type: 'path', ref: 'left-hip-front', expand: { x: 0.15, y: 0.15 } },
      ll_thigh: { type: 'path', ref: 'left-leg-upper-front', expand: { x: 0.1, y: 0.08 } },
      ll_knee: { type: 'path', ref: 'left-knee', expand: { x: 0.28, y: 0.28 } },
      ll_shin: { type: 'slice', ref: 'left-leg-lower-front', band: 'top', fraction: 0.55, pad: 4 },
      ll_calf: { type: 'slice', ref: 'left-leg-lower-front', band: 'bottom', fraction: 0.48, pad: 4 },
      ll_ankle: { type: 'path', ref: 'left-ankle', expand: { x: 0.28, y: 0.28 } },
    },
    leg_r: {
      ll_hip: { type: 'path', ref: 'right-hip-front', expand: { x: 0.15, y: 0.15 } },
      ll_thigh: { type: 'path', ref: 'right-leg-upper-front', expand: { x: 0.1, y: 0.08 } },
      ll_knee: { type: 'path', ref: 'right-knee', expand: { x: 0.28, y: 0.28 } },
      ll_shin: { type: 'slice', ref: 'right-leg-lower-front', band: 'top', fraction: 0.55, pad: 4 },
      ll_calf: { type: 'slice', ref: 'right-leg-lower-front', band: 'bottom', fraction: 0.48, pad: 4 },
      ll_ankle: { type: 'path', ref: 'right-ankle', expand: { x: 0.28, y: 0.28 } },
    },
  };

  var DIAGRAM_ROOT_VB = { w: 798.03553, h: 815.24999 };

  function isZoomDiagramView(viewKey) {
    return ZOOM_DIAGRAM_VIEW_KEYS.indexOf(viewKey) >= 0;
  }

  function unionBox(a, b) {
    if (!a) return b;
    if (!b) return a;
    var x1 = Math.min(a.x, b.x);
    var y1 = Math.min(a.y, b.y);
    var x2 = Math.max(a.x + a.width, b.x + b.width);
    var y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  function bboxOnSvgRoot(svg, el) {
    if (!el || !svg) return null;
    var bb;
    try {
      bb = el.getBBox();
    } catch (e) {
      return null;
    }
    var m = el.getCTM();
    if (!m) return bb;
    var corners = [
      { x: bb.x, y: bb.y },
      { x: bb.x + bb.width, y: bb.y },
      { x: bb.x + bb.width, y: bb.y + bb.height },
      { x: bb.x, y: bb.y + bb.height },
    ];
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var pt = svg.createSVGPoint();
    var i;
    for (i = 0; i < corners.length; i++) {
      pt.x = corners[i].x;
      pt.y = corners[i].y;
      var t = pt.matrixTransform(m);
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x);
      maxY = Math.max(maxY, t.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function computeDiagramCrop(svg, viewKey) {
    var wires = ZOOM_CROP_WIRES[viewKey];
    if (!svg || !wires) return null;
    var layer1 = svg.querySelector('#layer1');
    if (!layer1) return null;
    var union = null;
    var i;
    for (i = 0; i < wires.length; i++) {
      var el = layer1.querySelector('#' + wires[i]);
      if (!el) continue;
      union = unionBox(union, bboxOnSvgRoot(svg, el));
    }
    if (!union || union.width < 8 || union.height < 8) return null;
    var padX = Math.max(12, union.width * 0.08);
    var padY = Math.max(12, union.height * 0.08);
    return {
      x: Math.max(0, union.x - padX),
      y: Math.max(0, union.y - padY),
      w: Math.min(DIAGRAM_ROOT_VB.w, union.width + padX * 2),
      h: Math.min(DIAGRAM_ROOT_VB.h, union.height + padY * 2),
    };
  }

  function projectBoxToZoom(box, crop, zoomW, zoomH) {
    if (!box || !crop) return null;
    return {
      x: ((box.x - crop.x) / crop.w) * zoomW,
      y: ((box.y - crop.y) / crop.h) * zoomH,
      width: (box.width / crop.w) * zoomW,
      height: (box.height / crop.h) * zoomH,
    };
  }

  function layerBoxToRoot(svg, layer1, box) {
    if (!box || !layer1) return null;
    var pt = svg.createSVGPoint();
    var m = layer1.getCTM();
    if (!m) return box;
    var corners = [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x + box.width, box.y + box.height],
      [box.x, box.y + box.height],
    ];
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var i;
    for (i = 0; i < corners.length; i++) {
      pt.x = corners[i][0];
      pt.y = corners[i][1];
      var t = pt.matrixTransform(m);
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x);
      maxY = Math.max(maxY, t.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function zoomBuildKey(viewKey, regionId) {
    if (viewKey === 'arm_r' && regionId.indexOf('ar_') === 0) return regionId.replace(/^ar_/, 'al_');
    if (viewKey === 'leg_r' && regionId.indexOf('lr_') === 0) return regionId.replace(/^lr_/, 'll_');
    return regionId;
  }

  function applyZoomWireRegions(probeSvg, zoomSvg, viewKey) {
    var builds = ZOOM_WIRE_BUILDS[viewKey];
    var crop = computeDiagramCrop(probeSvg, viewKey);
    if (!builds || !crop || !zoomSvg) return crop;
    var layer1 = probeSvg.querySelector('#layer1');
    if (!layer1) return crop;
    var vbParts = (zoomSvg.getAttribute('viewBox') || '0 0 200 200').split(/\s+/);
    var zoomW = parseFloat(vbParts[2]) || 200;
    var zoomH = parseFloat(vbParts[3]) || 200;
    zoomSvg.querySelectorAll('.body-region[data-id]').forEach(function (pathEl) {
      var rid = pathEl.getAttribute('data-id');
      var build = builds[zoomBuildKey(viewKey, rid)];
      if (!build) return;
      var box = buildRegionBox(layer1, build);
      if (!box) return;
      var rootBox = layerBoxToRoot(probeSvg, layer1, box);
      if (!rootBox) return;
      var zbox = projectBoxToZoom(rootBox, crop, zoomW, zoomH);
      if (!zbox) return;
      var d = boxToPath(zbox);
      if (!d) return;
      pathEl.setAttribute('d', d);
      pathEl.setAttribute('data-cx', Math.round(((zbox.x + zbox.width / 2) / zoomW) * 1000) / 10);
      pathEl.setAttribute('data-cy', Math.round(((zbox.y + zbox.height / 2) / zoomH) * 1000) / 10);
    });
    return crop;
  }

  /** Back-compat: plain silhouette outline strings */
  var ZOOM_SILHOUETTES = {
    face: ZOOM_ART.face.outline,
    chest: ZOOM_ART.chest.outline,
    head_back: ZOOM_ART.head_back.outline,
    hand_l: ZOOM_ART.hand_l.outline,
    foot_l: ZOOM_ART.foot_l.outline,
  };

  /* —— Geometry helpers —— */
  function refBBox(group, refId) {
    var el = group.querySelector('#' + refId);
    if (!el) return null;
    try {
      return el.getBBox();
    } catch (e) {
      return null;
    }
  }

  function expandBox(b, expand) {
    if (!b) return null;
    var padX = Math.max(8, b.width * (expand.x || 0));
    var padY = Math.max(8, b.height * (expand.y || 0));
    return { x: b.x - padX, y: b.y - padY, width: b.width + padX * 2, height: b.height + padY * 2 };
  }

  function boxToPath(b) {
    if (!b || b.width < 1 || b.height < 1) return null;
    return 'M' + b.x + ' ' + b.y + ' H' + (b.x + b.width) + ' V' + (b.y + b.height) + ' H' + b.x + ' Z';
  }

  function sliceBox(b, band, fraction, pad) {
    if (!b) return null;
    pad = pad || 0;
    var f = Math.max(0.15, Math.min(0.85, fraction || 0.5));
    var slice;
    if (band === 'top') {
      slice = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height * f + pad };
    } else if (band === 'bottom') {
      var h = b.height * f;
      slice = { x: b.x - pad, y: b.y + b.height - h - pad * 0.5, width: b.width + pad * 2, height: h + pad };
    } else {
      var margin = b.height * ((1 - f) / 2);
      slice = { x: b.x - pad, y: b.y + margin, width: b.width + pad * 2, height: b.height * f };
    }
    return slice;
  }

  function splitLRBox(b, zone) {
    if (!b) return null;
    if (zone === 'left') return { x: b.x - 4, y: b.y - 4, width: b.width * 0.38 + 4, height: b.height + 8 };
    if (zone === 'right') return { x: b.x + b.width * 0.62 - 4, y: b.y - 4, width: b.width * 0.38 + 4, height: b.height + 8 };
    return { x: b.x + b.width * 0.31, y: b.y - 4, width: b.width * 0.38, height: b.height + 8 };
  }

  function jointBox(group, upperRef, lowerRef, pad) {
    var upper = refBBox(group, upperRef);
    var lower = refBBox(group, lowerRef);
    if (!upper && !lower) return null;
    if (!upper) return expandBox(lower, { x: 0.2, y: 0.2 });
    if (!lower) return expandBox(upper, { x: 0.2, y: 0.2 });
    pad = pad || 12;
    var yTop = upper.y + upper.height * 0.72;
    var yBot = lower.y + lower.height * 0.28;
    var xL = Math.min(upper.x, lower.x) - pad;
    var xR = Math.max(upper.x + upper.width, lower.x + lower.width) + pad;
    if (yBot <= yTop) {
      yTop = (upper.y + upper.height + lower.y) / 2 - pad;
      yBot = yTop + pad * 2;
    }
    return { x: xL, y: yTop - pad * 0.4, width: xR - xL, height: yBot - yTop + pad * 0.8 };
  }

  function shoulderBox(group, armRef, neckRef) {
    var arm = refBBox(group, armRef);
    if (!arm) return null;
    var neck = refBBox(group, neckRef);
    var pad = 18;
    var yTop = neck ? neck.y + neck.height * 0.45 : arm.y - arm.height * 0.25;
    var yBot = arm.y + arm.height * 0.46;
    return { x: arm.x - pad, y: yTop - pad * 0.5, width: arm.width + pad * 2, height: yBot - yTop + pad * 0.5 };
  }

  function buildRegionBox(group, build) {
    if (!build) return null;
    var b;
    switch (build.type) {
      case 'path':
        b = refBBox(group, build.ref);
        return expandBox(b, build.expand || { x: 0.15, y: 0.15 });
      case 'slice':
        b = refBBox(group, build.ref);
        return sliceBox(b, build.band, build.fraction, build.pad);
      case 'splitLR':
        b = refBBox(group, build.ref);
        return splitLRBox(b, build.zone);
      case 'joint':
        return jointBox(group, build.upper, build.lower, build.pad);
      case 'shoulder':
        return shoulderBox(group, build.arm, build.neck);
      case 'headZone':
        return headZoneBox(refBBox(group, build.ref), build.zone);
      default:
        return null;
    }
  }

  function regionPriority(part) {
    var scores = {
      Eye: 97, Ear: 96, 'Left eye': 97, 'Right eye': 97, 'Left ear': 96, 'Right ear': 96,
      Nose: 95, Lips: 94, Mouth: 93, Cheek: 92, 'Left cheek': 92, 'Right cheek': 92,
      Eyebrow: 91, 'Left eyebrow': 91, 'Right eyebrow': 91,
      Forehead: 90, Temple: 89, Chin: 88, Jaw: 87, Scalp: 86, Occiput: 86,
      Shoulder: 100, Elbow: 94, Wrist: 90, Knuckle: 89, Head: 85, Neck: 84,
      Hand: 78, Fingers: 74, Forearm: 68, 'Upper arm': 52, Chest: 42, Abdomen: 38,
      'Upper back': 38, 'Lower back': 36, Hip: 34, Thigh: 30, Knee: 28, Buttock: 28,
      Sacrum: 28, 'Pelvis / groin': 32, Ankle: 26, Achilles: 25, Foot: 24, Heel: 22,
      Toes: 20, 'Big toe': 21, 'Second toe': 20, 'Third toe': 20, 'Fourth toe': 20,
      'Little toe': 20, 'Lower leg / shin': 26, Calf: 26, 'Ball of foot': 23, Arch: 23,
    };
    return scores[part] || 55;
  }

  /** wireId for highlight when catalog id differs (e.g. chest-left → chest) */
  function wireIdForSpec(spec) {
    var b = spec.build;
    if (!b) return spec.id;
    if (b.type === 'path' || b.type === 'slice') return b.ref;
    if (b.type === 'shoulder') return b.arm;
    if (b.type === 'joint') return b.upper;
    if (b.type === 'splitLR') return b.ref;
    return spec.id;
  }

  function anchorFromBox(box, side, figure, svgW, svgH) {
    if (!box) return { x: 50, y: 50 };
    var cx = box.x + box.width / 2;
    if (side === 'Left') cx = box.x + box.width * 0.22;
    if (side === 'Right') cx = box.x + box.width * 0.78;
    var cy = box.y + box.height / 2;
    var figX0 = figure === 'back' ? svgW / 2 : 0;
    var figW = svgW / 2;
    return {
      x: Math.max(0, Math.min(100, Math.round(((cx - figX0) / figW) * 1000) / 10)),
      y: Math.max(0, Math.min(100, Math.round((cy / svgH) * 1000) / 10)),
    };
  }

  function ensureClip(doc, svg, clipId, box) {
    if (!box) return null;
    var defs = svg.querySelector('defs') || doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!defs.parentNode) svg.insertBefore(defs, svg.firstChild);
    var old = doc.getElementById(clipId);
    if (old) old.parentNode.removeChild(old);
    var clip = doc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clip.setAttribute('id', clipId);
    var rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(box.x));
    rect.setAttribute('y', String(box.y));
    rect.setAttribute('width', String(box.width));
    rect.setAttribute('height', String(box.height));
    clip.appendChild(rect);
    defs.appendChild(clip);
    return clipId;
  }

  function primaryRefForBuild(group, build) {
    if (!build) return null;
    if (build.ref) return group.querySelector('#' + build.ref);
    if (build.arm) return group.querySelector('#' + build.arm);
    if (build.upper) return group.querySelector('#' + build.upper);
    return null;
  }

  function isSelected(spec, selectedId) {
    if (!selectedId) return false;
    return selectedId === spec.id || resolveRegionId(selectedId) === spec.id;
  }

  /**
   * Wire regions using anatomical SVG path shapes from #layer1 (clipped where subdivided).
   * Rectangles are never used for highlight — only real path geometry.
   */
  function buildHitMesh(svg, selectedId) {
    var doc = svg.ownerDocument;
    var group = svg.getElementById('layer1');
    if (!group) return 0;

    var vb = svg.viewBox.baseVal;
    var svgW = vb.width || 798.03553;
    var svgH = vb.height || 815.24999;

    var oldMesh = svg.getElementById('body-hit-mesh');
    if (oldMesh) oldMesh.parentNode.removeChild(oldMesh);

    var mesh = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    mesh.setAttribute('id', 'body-hit-mesh');

    group.querySelectorAll('path[id]').forEach(function (p) {
      p.setAttribute('class', 'body-region-ref');
      p.setAttribute('pointer-events', 'none');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'none');
    });

    var count = 0;
    DUAL_REGION_SPECS.forEach(function (spec) {
      var build = spec.build;
      var refPath = primaryRefForBuild(group, build);
      var box = buildRegionBox(group, build);
      var d = null;
      var clipId = null;

      if (build.type === 'shoulder') {
        var armPath = group.querySelector('#' + build.arm);
        var neckPath = group.querySelector('#' + build.neck);
        if (armPath) d = armPath.getAttribute('d');
        if (!d && neckPath) d = neckPath.getAttribute('d');
        box = shoulderBox(group, build.arm, build.neck);
        clipId = ensureClip(doc, svg, 'clip-' + spec.id, box);
      } else if (build.type === 'joint') {
        var upperPath = group.querySelector('#' + build.upper);
        var lowerPath = group.querySelector('#' + build.lower);
        if (upperPath && lowerPath) {
          d = upperPath.getAttribute('d') + ' ' + lowerPath.getAttribute('d');
        } else if (upperPath) {
          d = upperPath.getAttribute('d');
        } else if (lowerPath) {
          d = lowerPath.getAttribute('d');
        }
        box = jointBox(group, build.upper, build.lower, build.pad);
        clipId = ensureClip(doc, svg, 'clip-' + spec.id, box);
      } else if (refPath) {
        d = refPath.getAttribute('d');
        if (build.type === 'slice' || build.type === 'splitLR' || build.type === 'headZone') {
          clipId = ensureClip(doc, svg, 'clip-' + spec.id, box);
        } else if (build.type === 'path') {
          try {
            box = expandBox(refPath.getBBox(), build.expand || { x: 0.15, y: 0.15 });
          } catch (e) {
            box = null;
          }
        }
      }

      if (!d) return;

      var bboxForAnchor = box;
      if (!bboxForAnchor && refPath) {
        try { bboxForAnchor = refPath.getBBox(); } catch (e) { /* ignore */ }
      }

      var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', 'hit-' + spec.id);
      path.setAttribute('d', d);
      if (clipId) path.setAttribute('clip-path', 'url(#' + clipId + ')');
      path.setAttribute('data-wire-id', wireIdForSpec(spec));
      path.setAttribute('data-priority', String(regionPriority(spec.part)));

      var anchor = anchorFromBox(bboxForAnchor, spec.side, spec.figure, svgW, svgH);
      var sel = isSelected(spec, selectedId) ? ' selected' : '';
      path.setAttribute('class', 'body-region' + sel);
      path.setAttribute('fill', 'rgba(0,0,0,0)');
      path.setAttribute('stroke', 'none');
      path.setAttribute('data-id', spec.id);
      path.setAttribute('data-part', spec.part);
      path.setAttribute('data-side', spec.side);
      path.setAttribute('data-figure', spec.figure);
      path.setAttribute('data-group', spec.group);
      path.setAttribute('data-cx', String(anchor.x));
      path.setAttribute('data-cy', String(anchor.y));
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', spec.side + ' ' + spec.part);
      mesh.appendChild(path);
      count++;
    });

    group.appendChild(mesh);
    return count;
  }

  var REGION_ID_ALIASES = {
    'chest': 'chest-centre',
    'abdomen': 'abdomen-centre',
    'back-lower': 'back-lower-centre',
    'back-upper': 'back-upper-centre',
    'buttocks': 'right-buttock',
    'left-hand-front': 'left-palm',
    'right-hand-front': 'right-palm',
    'left-knee-front': 'left-knee',
    'right-knee-front': 'right-knee',
    'left-ankle-front': 'left-ankle',
    'right-ankle-front': 'right-ankle',
  };

  function resolveRegionId(regionId) {
    return REGION_ID_ALIASES[regionId] || regionId;
  }

  function getRegionFocus(regionId) {
    regionId = resolveRegionId(regionId);
    var spec = catalogMetaById(regionId);
    if (!spec) return null;
    var anchor = REGION_ANCHORS[regionId];
    if (anchor) {
      var figLabel = spec.figure === 'back' ? 'Back' : 'Front';
      return {
        id: regionId, part: spec.part, side: spec.side, figure: spec.figure,
        figureLabel: figLabel, listLabel: figLabel + ' · ' + spec.part,
        view: spec.figure === 'back' ? 'back' : 'front', x: anchor.x, y: anchor.y,
      };
    }
    var vk;
    for (vk in ZOOM_VIEWS) {
      if (!ZOOM_VIEWS.hasOwnProperty(vk)) continue;
      var list = ZOOM_VIEWS[vk].regions;
      var j;
      for (j = 0; j < list.length; j++) {
        if (list[j].id === regionId) {
          var vLabel = ZOOM_VIEWS[vk].label;
          return {
            id: regionId, part: list[j].part, side: list[j].side, figure: list[j].figure,
            figureLabel: vLabel, listLabel: vLabel + ' · ' + list[j].part,
            view: vk, x: list[j].cx, y: list[j].cy,
          };
        }
      }
    }
    return null;
  }

  var REGION_ANCHORS = {};

  function cacheRegionAnchors(svg) {
    REGION_ANCHORS = {};
    if (!svg) return REGION_ANCHORS;
    svg.querySelectorAll('.body-region[data-id]').forEach(function (path) {
      REGION_ANCHORS[path.getAttribute('data-id')] = {
        x: parseFloat(path.getAttribute('data-cx')),
        y: parseFloat(path.getAttribute('data-cy')),
        part: path.getAttribute('data-part'),
        side: path.getAttribute('data-side'),
        figure: path.getAttribute('data-figure'),
      };
    });
    return REGION_ANCHORS;
  }

  function catalogMetaById(id) {
    var i;
    for (i = 0; i < DUAL_REGION_SPECS.length; i++) {
      if (DUAL_REGION_SPECS[i].id === id) return DUAL_REGION_SPECS[i];
    }
    var vk;
    for (vk in ZOOM_VIEWS) {
      if (!ZOOM_VIEWS.hasOwnProperty(vk)) continue;
      var regs = ZOOM_VIEWS[vk].regions;
      for (i = 0; i < regs.length; i++) {
        if (regs[i].id === id) return regs[i];
      }
    }
    return null;
  }

  function listAllCatalogRegions() {
    var out = [];
    DUAL_REGION_SPECS.forEach(function (s) {
      var figLabel = s.figure === 'back' ? 'Back' : 'Front';
      out.push({
        id: s.id, part: s.part, side: s.side, figure: s.figure, group: s.group,
        subgroup: s.group,
        figureLabel: figLabel,
        listLabel: figLabel + ' · ' + s.part,
        viewKey: 'dual', viewLabel: 'Front and back', recordView: s.figure,
      });
    });
    Object.keys(ZOOM_VIEWS).forEach(function (viewKey) {
      var v = ZOOM_VIEWS[viewKey];
      v.regions.forEach(function (r) {
        out.push({
          id: r.id, part: r.part, side: r.side, figure: r.figure, group: r.group,
          subgroup: r.subgroup || v.label,
          figureLabel: v.label,
          listLabel: v.label + ' · ' + r.part,
          viewKey: viewKey, viewLabel: v.label, recordView: viewKey,
        });
      });
    });
    return out;
  }

  global.BodyMapCatalog = {
    BODY_PART_NAMES: BODY_PART_NAMES,
    ANATOMY_GROUPS: ANATOMY_GROUPS,
    DUAL_REGION_SPECS: DUAL_REGION_SPECS,
    ZOOM_VIEWS: ZOOM_VIEWS,
    ZOOM_SILHOUETTES: ZOOM_SILHOUETTES,
    ZOOM_ART: ZOOM_ART,
    ZOOM_DIAGRAM_VIEW_KEYS: ZOOM_DIAGRAM_VIEW_KEYS,
    ZOOM_CROP_WIRES: ZOOM_CROP_WIRES,
    isZoomDiagramView: isZoomDiagramView,
    computeDiagramCrop: computeDiagramCrop,
    applyZoomWireRegions: applyZoomWireRegions,
    DIAGRAM_ROOT_VB: DIAGRAM_ROOT_VB,
    FACE_REGIONS: FACE_REGIONS,
    HAND_L_REGIONS: HAND_L_REGIONS,
    HAND_R_REGIONS: HAND_R_REGIONS,
    FOOT_L_REGIONS: FOOT_L_REGIONS,
    FOOT_R_REGIONS: FOOT_R_REGIONS,
    HEAD_BACK_REGIONS: HEAD_BACK_REGIONS,
    CHEST_REGIONS: CHEST_REGIONS,
    ABDOMEN_REGIONS: ABDOMEN_REGIONS,
    BACK_REGIONS: BACK_REGIONS,
    ARM_L_REGIONS: ARM_L_REGIONS,
    ARM_R_REGIONS: ARM_R_REGIONS,
    LEG_L_REGIONS: LEG_L_REGIONS,
    LEG_R_REGIONS: LEG_R_REGIONS,
    buildHitMesh: buildHitMesh,
    buildRegionBox: buildRegionBox,
    catalogMetaById: catalogMetaById,
    listAllCatalogRegions: listAllCatalogRegions,
    regionPriority: regionPriority,
    wireIdForSpec: wireIdForSpec,
    resolveRegionId: resolveRegionId,
    REGION_ID_ALIASES: REGION_ID_ALIASES,
    getRegionFocus: getRegionFocus,
    cacheRegionAnchors: cacheRegionAnchors,
    REGION_ANCHORS: REGION_ANCHORS,
  };
})(typeof window !== 'undefined' ? window : this);
