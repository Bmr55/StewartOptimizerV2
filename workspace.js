<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <title>Stewart Platform Control — RAW-matched Anim, Safe IK</title>
    <style>
        :root {
            --bg-0: #1e1e1e;
            --bg-1: #2c2c2c;
            --bg-2: #111111;
            --fg: #f0f0f0;
            --muted: #b8b8b8;
            --accent: #ffcc00;
            --btn: #444;
            --btn-br: #666;
            --btn-hover: #555;
            --panel-shadow: 0 0 10px rgba(0, 0, 0, .5);
            --panel-radius: 10px;
            --row-gap: 12px;
            --pad: 14px;
            --x: #c0392b;
            --x-br: #e74c3c;
            --x-hover: #a93226;
            --y: #1e8449;
            --y-br: #27ae60;
            --y-hover: #196f3d;
            --z: #21618c;
            --z-br: #3498db;
            --z-hover: #1b4f72;
            --ok: #1e8449;
            --bad: #c0392b;
            --off: #777
        }

        * {
            box-sizing: border-box
        }

        body {
            margin: 0;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
            background: var(--bg-0);
            color: var(--fg);
            display: flex;
            gap: 20px;
            padding: 20px;
            align-items: flex-start;
            justify-content: center
        }

        .panel {
            min-width: 300px;
            background: var(--bg-1);
            padding: var(--pad);
            border-radius: var(--panel-radius);
            box-shadow: var(--panel-shadow);
            display: flex;
            flex-direction: column;
            gap: var(--row-gap)
        }

        h3 {
            margin: 0 0 4px 0;
            color: var(--accent);
            font-size: 16px;
            letter-spacing: .2px
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px
        }

        .axis {
            background: rgba(255, 255, 255, .03);
            border: 1px solid rgba(255, 255, 255, .06);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px
        }

        .row {
            display: grid;
            grid-template-columns: 46px 1fr 46px;
            gap: 10px;
            align-items: center
        }

        .subrow {
            display: grid;
            grid-template-columns: 70px 1fr;
            gap: 10px;
            align-items: center
        }

        .lrow {
            display: grid;
            grid-template-columns: 1fr 1fr 70px 70px;
            gap: 10px;
            align-items: center
        }

        .lrow label {
            color: var(--muted);
            font-size: 12px
        }

        .vrow {
            display: flex;
            flex-direction: column;
            gap: 6px
        }

        button {
            background: var(--btn);
            border: 1px solid var(--btn-br);
            color: var(--fg);
            border-radius: 8px;
            padding: 8px 10px;
            cursor: pointer;
            font-weight: 600
        }

        button:hover {
            background: var(--btn-hover)
        }

        .mini {
            padding: 6px 0;
            font-weight: 700
        }

        .btn-x {
            background: var(--x);
            border-color: var(--x-br)
        }

        .btn-x:hover {
            background: var(--x-hover)
        }

        .btn-y {
            background: var(--y);
            border-color: var(--y-br)
        }

        .btn-y:hover {
            background: var(--y-hover)
        }

        .btn-z {
            background: var(--z);
            border-color: var(--z-br)
        }

        .btn-z:hover {
            background: var(--z-hover)
        }

        .num {
            width: 56px;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid #555;
            background: #1b1b1b;
            color: var(--fg);
            text-align: center;
            font-variant-numeric: tabular-nums
        }

        input[type="number"] {
            width: 100%;
            padding: 8px 10px;
            border-radius: 6px;
            border: 1px solid #555;
            background: #1b1b1b;
            color: var(--fg)
        }

        input[type="range"] {
            width: 100%;
            accent-color: var(--accent)
        }

        select,
        input[type="checkbox"] {
            cursor: pointer
        }

        #canvas {
            flex-shrink: 0;
            width: 750px;
            height: 750px;
            background: var(--bg-2);
            border: 2px solid #444;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 0, 0, .7)
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            padding: 8px 10px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, .08);
            background: rgba(255, 255, 255, .03);
            width: max-content
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--ok);
            box-shadow: 0 0 8px rgba(0, 0, 0, .4) inset
        }

        .status.bad .dot {
            background: var(--bad)
        }

        .status span {
            color: #e9e9e9
        }

        .blocked {
            animation: blocked 250ms ease-out
        }

        @keyframes blocked {
            0% {
                box-shadow: 0 0 0 0 rgba(192, 57, 43, .8)
            }

            100% {
                box-shadow: 0 0 0 6px rgba(192, 57, 43, 0)
            }
        }

        .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: #202020;
            border: 1px solid #444;
            font-size: 12px
        }

        .pill .led {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--off)
        }

        .pill.playing .led {
            background: var(--ok)
        }

        .inline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px
        }

        .muted {
            color: var(--muted);
            font-size: 12px
        }

        /* Small helper grid for keybinding UI */
        .kb-grid {
            display: grid;
            grid-template-columns: 120px 1fr 1fr 1fr;
            gap: 8px;
            align-items: center;
        }

        .kb-grid .label {
            color: var(--muted);
            font-size: 12px;
            text-align: right;
            padding-right: 6px;
        }

        .kb-row {
            display: contents;
        }

        .kb-btn {
            font-size: 12px;
            padding: 6px 8px;
        }
    </style>
</head>

<body>
    <!-- Left: Mechanical, View, Safety & Animation Controls -->
    <section class="panel" id="controls-left">
        <h3>Mechanical</h3>
        <div class="lrow"><label for="rodLengthSlider">Rod Length (mm)</label><input type="range" id="rodLengthSlider"
                min="50" max="300" value="130"><input class="num" type="number" id="rodLengthInput" min="50" max="300"
                value="130"><button id="rodLengthReset">Reset</button></div>
        <div class="lrow"><label for="hornLengthSlider">Horn Length (mm)</label><input type="range"
                id="hornLengthSlider" min="10" max="100" value="50"><input class="num" type="number"
                id="hornLengthInput" min="10" max="100" value="50"><button id="hornLengthReset">Reset</button></div>
        <div class="lrow"><label for="baseRadiusSlider">Base Radius (mm)</label><input type="range"
                id="baseRadiusSlider" min="50" max="200" value="80"><input class="num" type="number"
                id="baseRadiusInput" min="50" max="200" value="80"><button id="baseRadiusReset">Reset</button></div>
        <div class="lrow"><label for="platformRadiusSlider">Platform Radius (mm)</label><input type="range"
                id="platformRadiusSlider" min="30" max="150" value="50"><input class="num" type="number"
                id="platformRadiusInput" min="30" max="150" value="50"><button id="platformRadiusReset">Reset</button>
        </div>
        <div class="lrow"><label for="anchorDistanceSlider">Anker Distance (mm)</label><input type="range"
                id="anchorDistanceSlider" min="0" max="120" value="40"><input class="num" type="number"
                id="anchorDistanceInput" min="0" max="120" value="40"><button id="anchorDistanceReset">Reset</button>
        </div>
        <div class="lrow"><label for="shaftDistanceSlider">Shaft Distance (mm)</label><input type="range"
                id="shaftDistanceSlider" min="0" max="120" value="30"><input class="num" type="number"
                id="shaftDistanceInput" min="0" max="120" value="30"><button id="shaftDistanceReset">Reset</button>
        </div>

        <div class="vrow">
            <label><input type="checkbox" id="platformTurnCheckbox" checked> Platform Turn</label>
            <label><input type="checkbox" id="hornDirCheckbox"> Horn Direction</label>
        </div>

        <div class="vrow">
            <label class="inline"><span>Servo Angle Range (°)</span><span class="muted">min / max</span></label>
            <div style="display:flex; gap:8px; align-items:center;">
                <input class="num" id="servoMinInput" type="number" step="1" value="-90"
                    aria-label="Servo min (degrees)">
                <span class="muted">to</span>
                <input class="num" id="servoMaxInput" type="number" step="1" value="90"
                    aria-label="Servo max (degrees)">
                <button id="servoRangeReset">Reset</button>
            </div>
        </div>

        <h3>View</h3>
        <div class="lrow"><label for="viewXSlider">View X (°)</label><input type="range" id="viewXSlider" min="0"
                max="90" value="45" step="1"><input class="num" type="number" id="viewXInput" min="0" max="90"
                value="45"><button id="viewXReset">Reset</button></div>
        <div class="lrow"><label for="viewYSlider">View Y (°)</label><input type="range" id="viewYSlider" min="-90"
                max="90" value="0" step="1"><input class="num" type="number" id="viewYInput" min="-90" max="90"
                value="0"><button id="viewYReset">Reset</button></div>
        <div class="lrow"><label for="viewZSlider">View Z (°)</label><input type="range" id="viewZSlider" min="-90"
                max="90" value="0" step="1"><input class="num" type="number" id="viewZInput" min="-90" max="90"
                value="0"><button id="viewZReset">Reset</button></div>

        <h3>Safety</h3>
        <div class="vrow">
            <label><input type="checkbox" id="ikClampCheckbox" checked> Enforce Valid Kinematics</label>
            <label><input type="checkbox" id="ikClampAnimCheckbox" checked> Enforce on Animations</label>
            <label class="inline"><span>Ball Joint Half-Angle (°)</span><input class="num" type="number"
                    id="ballJointLimitInput" min="5" max="89" step="0.5" value="45"
                    title="Max angle the rod can deflect from the joint's NEUTRAL direction (cone half-angle). For a ball joint spec'd as full swivel range S° (limit-to-limit), enter S/2. Examples: standard rod end → 30°, McMaster high-misalignment joint with 65° total swivel → 32.5°, premium uniball → up to 45°."></label>
            <label class="inline"><span>Rod Length Tol. (mm)</span><input class="num" type="number"
                    id="rodLengthToleranceInput" min="0.05" max="5" step="0.05" value="0.5"
                    title="Maximum allowed deviation between rod length and the geometric distance from horn tip to platform anchor."></label>
            <div id="ikStatus" class="status" role="status" aria-live="polite" title="IK: OK">
                <div class="dot"></div><span>IK: OK</span>
            </div>
        </div>

        <div class="section-header">
            <h3 style="margin:0;">Animation</h3>
            <button id="animToggle" class="pill" aria-pressed="false" title="Play/Pause (Space)"><span
                    class="led"></span><span class="label">Play</span></button>
        </div>

        <div class="vrow">
            <label class="inline" for="animationSpeedSlider"><span>Speed</span><span id="speedVal"
                    class="muted">100%</span></label>
            <input type="range" id="animationSpeedSlider" min="10" max="300" step="5" value="100"
                aria-label="Animation speed percent">
        </div>

        <div class="vrow">
            <label for="animationPatternSelect">Pattern</label>
            <select id="animationPatternSelect">
                <option value="none">None</option>
                <option value="wobble">Wobble</option>
                <option value="pingpong">Pingpong</option>
                <option value="rotate">Rotate</option>
                <option value="tilt">Tilt</option>
                <option value="helical">Helical Sweep</option>
                <option value="keyboard">Keyboard</option>
                <option value="gamepad">Gamepad</option>
            </select>
        </div>

        <!-- Pingpong control: only visible when Pingpong pattern selected -->
        <div id="pingpongControls" class="lrow" style="display:none;">
            <label for="ballApexSlider">Ball Apex (mm)</label>
            <input type="range" id="ballApexSlider" min="50" max="300" value="140" step="5">
            <input class="num" type="number" id="ballApexInput" min="50" max="300" value="140">
            <button id="ballApexReset">Reset</button>
        </div>
    </section>

    <!-- Center: Canvas -->
    <div id="canvas"></div>

    <!-- Right: Translation & Rotation Controls -->
    <section class="panel" id="controls-right">
        <h3>Translation</h3>
        <div class="axis" data-axis="x" data-type="t">
            <div class="row"><button class="mini btn-x" id="xMinus">X-</button><input type="range" id="xSlider"
                    min="-200" max="200" value="0" step="0.1"><button class="mini btn-x" id="xPlus">X+</button></div>
            <div class="subrow"><button id="xReset">Reset</button><input type="number" id="xInput" min="-200" max="200"
                    step="1" value="0"></div>
        </div>
        <div class="axis" data-axis="y" data-type="t">
            <div class="row"><button class="mini btn-y" id="yMinus">Y-</button><input type="range" id="ySlider"
                    min="-200" max="200" value="0" step="0.1"><button class="mini btn-y" id="yPlus">Y+</button></div>
            <div class="subrow"><button id="yReset">Reset</button><input type="number" id="yInput" min="-200" max="200"
                    step="1" value="0"></div>
        </div>
        <div class="axis" data-axis="z" data-type="t">
            <div class="row"><button class="mini btn-z" id="zMinus">Z-</button><input type="range" id="zSlider"
                    min="-200" max="200" value="0" step="0.1"><button class="mini btn-z" id="zPlus">Z+</button></div>
            <div class="subrow"><button id="zReset">Reset</button><input type="number" id="zInput" min="-200" max="200"
                    step="1" value="0"></div>
        </div>

        <h3>Rotation</h3>
        <!-- Correct the labels and colors for rotation axes: X (red), Y (green), Z (blue) -->
        <div class="axis" data-axis="rx" data-type="r">
            <div class="row"><button class="mini btn-x" id="rxMinus">X-</button><input type="range" id="rxSlider"
                    min="-180" max="180" value="0" step="0.1"><button class="mini btn-x" id="rxPlus">X+</button></div>
            <div class="subrow"><button id="rxReset">Reset</button><input type="number" id="rxInput" min="-180"
                    max="180" step="1" value="0"></div>
        </div>
        <div class="axis" data-axis="ry" data-type="r">
            <div class="row"><button class="mini btn-y" id="ryMinus">Y-</button><input type="range" id="rySlider"
                    min="-180" max="180" value="0" step="0.1"><button class="mini btn-y" id="ryPlus">Y+</button></div>
            <div class="subrow"><button id="ryReset">Reset</button><input type="number" id="ryInput" min="-180"
                    max="180" step="1" value="0"></div>
        </div>
        <div class="axis" data-axis="rz" data-type="r">
            <div class="row"><button class="mini btn-z" id="rzMinus">Z-</button><input type="range" id="rzSlider"
                    min="-180" max="180" value="0" step="0.1"><button class="mini btn-z" id="rzPlus">Z+</button></div>
            <div class="subrow"><button id="rzReset">Reset</button><input type="number" id="rzInput" min="-180"
                    max="180" step="1" value="0"></div>
        </div>

        <div class="vrow"><button id="resetAll">Reset All</button></div>

        <!-- Servo angles collapsible panel -->
        <details id="servoAnglesPanel">
            <summary>Servo Angles</summary>
            <ul id="servoAnglesList" style="list-style:none; padding-left:0; margin: 8px 0;">
                <li>Servo 1: <span>0°</span></li>
                <li>Servo 2: <span>0°</span></li>
                <li>Servo 3: <span>0°</span></li>
                <li>Servo 4: <span>0°</span></li>
                <li>Servo 5: <span>0°</span></li>
                <li>Servo 6: <span>0°</span></li>
            </ul>
        </details>
        <!-- Serial connection button.  Clicking this will prompt the user to select a
             serial port via the Web Serial API.  Once connected the button text
             will reflect the connected state.  Servo angles are streamed to the
             connected device whenever they update. -->
        <button id="connectSerial" style="margin-top:8px;">Connect Serial</button>
        <button id="openInOptimizer" style="margin-top:8px;">Open in Optimizer</button>
        <div id="layoutImportNotice" style="margin-top:8px;font-size:12px;color:#9bd9ff;display:none;">
            Layout imported from optimizer.
            <a href="#" id="clearImportedLayout" style="color:#ffd43b;">Clear and use sliders</a>
        </div>
    </section>

    <!-- Keyboard control panel (shown when Keyboard pattern is selected) -->
    <section class="panel" id="keyboardPanel" style="display:none;">
        <h3>Keyboard</h3>
        <div class="axis">
            <div class="vrow" style="margin-top:0;">
                <label class="inline"><span>Translation step (per frame, mm)</span><input class="num"
                        id="transStepInput" type="number" step="0.1" value="1"></label>
                <label class="inline"><span>Rotation step (per frame, °)</span><input class="num" id="rotStepInput"
                        type="number" step="0.1" value="1"></label>
            </div>

            <h3 style="margin-top:6px;">Key Bindings</h3>
            <div class="kb-grid">
                <div class="kb-row">
                    <div class="label">X</div>
                    <button class="kb-btn" id="bindXNeg">Set X- Key</button>
                    <button class="kb-btn" id="bindXPos">Set X+ Key</button>
                    <select id="axisMapX">
                        <option value="off">Off</option>
                        <option value="mouseX">Mouse X</option>
                        <option value="mouseY">Mouse Y</option>
                        <option value="wheel">Scroll Wheel</option>
                    </select>
                </div>
                <div class="kb-row">
                    <div class="label">Y</div>
                    <button class="kb-btn" id="bindYNeg">Set Y- Key</button>
                    <button class="kb-btn" id="bindYPos">Set Y+ Key</button>
                    <select id="axisMapY">
                        <option value="off">Off</option>
                        <option value="mouseX">Mouse X</option>
                        <option value="mouseY">Mouse Y</option>
                        <option value="wheel">Scroll Wheel</option>
                    </select>
                </div>
                <div class="kb-row">
                    <div class="label">Z</div>
                    <button class="kb-btn" id="bindZNeg">Set Z- Key</button>
                    <button class="kb-btn" id="bindZPos">Set Z+ Key</button>
                    <select id="axisMapZ">
                        <option value="off">Off</option>
                        <option value="mouseX">Mouse X</option>
                        <option value="mouseY">Mouse Y</option>
                        <option value="wheel">Scroll Wheel</option>
                    </select>
                </div>
                <div class="kb-row">
                    <div class="label">RX</div>
                    <button class="kb-btn" id="bindRXNeg">Set RX- Key</button>
                    <button class="kb-btn" id="bindRXPos">Set RX+ Key</button>
                    <select id="axisMapRX">
                        <option value="off">Off</option>
                        <option value="mouseX">Mouse X</option>
                        <option value="mouseY">Mouse Y</option>
                        <option value="wheel">Scroll Wheel</option>
                    </select>
                </div>
                <div class="kb-row">
                    <div class="label">RY</div>
                    <button class="kb-btn" id="bindRYNeg">Set RY- Key</button>
                    <button class="kb-btn" id="bindRYPos">Set RY+ Key</button>
                    <select id="axisMapRY">
                        <option value="off">Off</option>
                        <option value="mouseX">Mouse X</option>
                        <option value="mouseY">Mouse Y</option>
                        <option value="wheel">Scroll Wheel</option>
                    </select>
                </div>
                <div class="kb-row">
                    <div class="label">RZ</div>
                    <button class="kb-btn" id="bindRZNeg">Set RZ- Key</button>
                    <button class="kb-btn" id="bindRZPos">Set RZ+ Key</button>
                    <select id="axisMapRZ">
                        <option value="off">Off</option>
                        <option value="mouseX">Mouse X</option>
                        <option value="mouseY">Mouse Y</option>
                        <option value="wheel">Scroll Wheel</option>
                    </select>
                </div>
            </div>
        </div>
    </section>

    <!-- Libraries -->
    <script src="js/p5.min.js"></script>
    <script src="js/quaternion.min.js"></script>
    <script src="js/stewart.min.js"></script>

    <script>
        // ---------- State ----------
        let platform, animator;           // Stewart + Stewart.Animation
        let ball = null;                  // pingpong controller (unchanged)
        const position = { x: 0, y: 0, z: 0 };       // base pose from UI (offset)
        const rotation = { rx: 0, ry: 0, rz: 0 };    // deg
        // Start view.x at 90° so that with the slider default of 45 the internal
        // mapping (135 − slider) results in a rendered angle of 45°.
        const view = { x: 90, y: 0, z: 0 };          // scene rot (deg)

        let ikClampEnabled = true;
        let ikClampAnimEnabled = true;

        // default increments for manual buttons; also starting values for continuous loop (editable via UI)
        // Set default step increments to 1 so that the user can fine‑tune motion
        // via the UI. Fractional values are allowed because rounding has been
        // removed from the step handlers.
        let stepPos = 1, stepRot = 1;

        // Define distinct colors for each of the six servos. These colors will be
        // used both in the UI servo angle list and in the rendered servo markers.
        const servoColors = [
            '#e74c3c', // Servo 1 – red
            '#27ae60', // Servo 2 – green
            '#3498db', // Servo 3 – blue
            '#9b59b6', // Servo 4 – purple
            '#e67e22', // Servo 5 – orange
            '#f1c40f'  // Servo 6 – yellow
        ];

        /*
         * ----- Serial streaming support -----
         *
         * The Web Serial API allows this page to send the current servo angles
         * directly to a connected microcontroller over USB.  Click the
         * “Connect Serial” button near the servo angles panel to open a
         * connection.  Once connected, the button text will change to
         * indicate the connected state.  Servo angles are streamed on
         * each update via the sendServoAngles() helper below.  If a
         * connection already exists, clicking the button again will close
         * it and revert the text.
         */

        // Keep track of the current SerialPort and writer.  When no
        // connection is active these are null.
        let serialPort = null;
        let serialWriter = null;

        // Open a serial port at 115200 baud and prepare a text writer.  If
        // successful the global serialWriter will be set; otherwise an
        // alert is shown and serialWriter remains null.  You can extend
        // this function to handle reconnection logic or error reporting.
        async function connectSerial() {
            if (!('serial' in navigator)) {
                alert('Web Serial API is not supported in this browser.');
                return;
            }
            try {
                // Request a serial port from the user.  This call will
                // display the browser’s native port picker.
                serialPort = await navigator.serial.requestPort();
                // Open the port with a standard baud rate.  Adjust this
                // value to match your microcontroller’s configuration.
                await serialPort.open({ baudRate: 115200 });
                // Create a TextEncoderStream to convert strings into a
                // byte stream.  Pipe its readable to the port’s writable.
                const textEncoder = new TextEncoderStream();
                textEncoder.readable.pipeTo(serialPort.writable);
                serialWriter = textEncoder.writable.getWriter();
                // Update the button label to indicate that a connection is
                // established.
                const btn = document.getElementById('connectSerial');
                if (btn) btn.textContent = 'Serial Connected';
            } catch (err) {
                console.error('Failed to open serial port:', err);
                alert('Failed to open serial port: ' + err);
                serialPort = null;
                serialWriter = null;
            }
        }

        // Send an array of servo angles (in degrees) over the serial
        // connection.  Each angle is rounded to two decimal places.  For
        // mechanical symmetry the second servo in each adjacent pair
        // (indices 1, 3 and 5) is negated before being transmitted.
        async function sendServoAngles(angleArray) {
            if (!serialWriter) return;
            try {
                const payload = angleArray.map((v, idx) => {
                    // If the angle is null or undefined, fall back to zero.
                    let deg = (v === null || v === undefined) ? 0 : v;
                    // Negate every second servo in a pair: servo 2,4,6 (1‑indexed)
                    if (idx % 2 === 1) deg = -deg;
                    return deg.toFixed(2);
                }).join(',') + '\n';
                await serialWriter.write(payload);
            } catch (err) {
                console.error('Error writing to serial port:', err);
            }
        }

        // Wire up the connect button.  When clicked, this will either
        // establish a new connection or close an existing one.
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('connectSerial');
            if (btn) {
                btn.addEventListener('click', async () => {
                    // If already connected, close the port and reset state.
                    if (serialWriter) {
                        try {
                            await serialWriter.close();
                        } catch (_) { }
                        serialWriter = null;
                        if (serialPort) {
                            try { await serialPort.close(); } catch (_) { }
                            serialPort = null;
                        }
                        btn.textContent = 'Connect Serial';
                        return;
                    }
                    // Otherwise attempt to connect.
                    await connectSerial();
                });
            }
        });

        const opts = {
            rodLength: 130, hornLength: 50, baseRadius: 80, platformRadius: 50,
            anchorDistance: 40, shaftDistance: 30,
            platformTurn: true, hornDirection: false,
            servoRange: [-90 * Math.PI / 180, 90 * Math.PI / 180]
        };

        // Simple playback control (external to Stewart.Animation so we can scale speed)
        const uiAnim = { playing: false, pattern: 'none', pct: 100, startMs: 0 };
        Object.defineProperty(uiAnim, 'periodScale', { get() { return 100 / Math.max(10, Math.min(300, this.pct)); } });
        function play() { uiAnim.playing = true; uiAnim.startMs = performance.now(); }
        function pause() { uiAnim.playing = false; }

        // ---------- IK status UI ----------
        const ikStatusEl = document.getElementById('ikStatus');
        function setIKStatus(ok, reason = '', extra = null) {
            ikStatusEl.classList.toggle('bad', !ok);
            const doc = getComputedStyle(document.documentElement);
            ikStatusEl.querySelector('.dot').style.background = ok ? doc.getPropertyValue('--ok') : doc.getPropertyValue('--bad');
            let label;
            if (!ok) {
                label = `IK: Blocked${reason ? ' — ' + reason : ''}`;
            } else if (extra && Number.isFinite(extra.maxBallAngleDeg)) {
                label = `IK: OK (max ball joint ${extra.maxBallAngleDeg.toFixed(0)}°)`;
            } else {
                label = 'IK: OK';
            }
            ikStatusEl.querySelector('span').textContent = label;
            ikStatusEl.title = label; ikStatusEl.setAttribute('aria-label', label);
        }

        // ---------- Helpers ----------
        function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
        function normDeg(d) { let v = (+d) || 0; while (v > 180) v -= 360; while (v < -180) v += 360; return v; }
        function dist3(a, b) { const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
        function vec3Sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
        function vec3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
        function vec3Norm(v) {
            const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
            return m < 1e-12 ? [0, 0, 1] : [v[0] / m, v[1] / m, v[2] / m];
        }
        // Rodrigues rotation around a unit-length axis
        function rotateAroundAxis(v, axis, angle) {
            const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
            const [vx, vy, vz] = v, [ax, ay, az] = axis;
            const dot = vx * ax + vy * ay + vz * az;
            return [
                vx * c + (ay * vz - az * vy) * s + ax * dot * t,
                vy * c + (az * vx - ax * vz) * s + ay * dot * t,
                vz * c + (ax * vy - ay * vx) * s + az * dot * t,
            ];
        }
        // Rotate 3-vector by quaternion (uses Quaternion library if available)
        function rotateByQuat(v, q) {
            if (q && typeof q.rotateVector === 'function') return q.rotateVector(v);
            // Fallback: v' = q v q^-1 with v as pure quaternion
            const w = q.w, x = q.x, y = q.y, z = q.z;
            const ix = w * v[0] + y * v[2] - z * v[1];
            const iy = w * v[1] + z * v[0] - x * v[2];
            const iz = w * v[2] + x * v[1] - y * v[0];
            const iw = -x * v[0] - y * v[1] - z * v[2];
            return [
                ix * w + iw * -x + iy * -z - iz * -y,
                iy * w + iw * -y + iz * -x - ix * -z,
                iz * w + iw * -z + ix * -y - iy * -x,
            ];
        }

        // Cache of home rod directions / home servo angles per leg, used to
        // compute ball joint deflection. Refreshed by captureHomeRodReference()
        // every time rebuildPlatform() runs.
        let homeRodDirs = null;
        let homeServoAngles = null;
        let homeBetaAngles = null;

        function captureHomeRodReference() {
            homeRodDirs = null;
            homeServoAngles = null;
            homeBetaAngles = null;
            if (!platform || !platform.B || platform.B.length !== 6) return;
            const prevPos = platform.translation ? platform.translation.slice() : [0, 0, 0];
            const prevQ = platform.orientation || Quaternion.ONE;
            try {
                platform.update([0, 0, 0], Quaternion.ONE);
                const angles = platform.getServoAngles ? platform.getServoAngles() : new Array(6).fill(0);
                const dirs = [], alphas = [], betas = [];
                for (let i = 0; i < 6; i++) {
                    const rod = vec3Sub(platform.q[i], platform.H[i]);
                    dirs.push(vec3Norm(rod));
                    alphas.push(Number.isFinite(angles[i]) ? angles[i] : 0);
                    betas.push(Math.atan2(platform.sinBeta[i] || 0, platform.cosBeta[i] || 0));
                }
                homeRodDirs = dirs;
                homeServoAngles = alphas;
                homeBetaAngles = betas;
            } catch (e) {
                console.warn('captureHomeRodReference failed', e);
            } finally {
                try { platform.update(prevPos, prevQ); } catch (_) { }
            }
        }

        // Per-leg ball joint deflection (radians) at the current platform pose.
        // Returns array of {leg, lower, upper, max} or null if reference data missing.
        function computeBallJointAnglesAtCurrent(candQ) {
            if (!platform || !homeRodDirs || !homeServoAngles || !homeBetaAngles) return null;
            const angles = platform.getServoAngles ? platform.getServoAngles() : null;
            const out = [];
            for (let i = 0; i < 6; i++) {
                const rod = vec3Sub(platform.q[i], platform.H[i]);
                const rodDir = vec3Norm(rod);
                const homeDir = homeRodDirs[i];
                const beta = homeBetaAngles[i];
                const shaftAxis = [-Math.sin(beta), Math.cos(beta), 0];
                const alphaCurrent = (angles && Number.isFinite(angles[i])) ? angles[i] : homeServoAngles[i];
                const dAlpha = alphaCurrent - homeServoAngles[i];
                const lowerNeutral = rotateAroundAxis(homeDir, shaftAxis, dAlpha);
                const lowerAngle = Math.acos(Math.max(-1, Math.min(1, vec3Dot(rodDir, lowerNeutral))));
                const upperNeutral = candQ ? rotateByQuat(homeDir, candQ) : homeDir;
                const upperAngle = Math.acos(Math.max(-1, Math.min(1, vec3Dot(rodDir, upperNeutral))));
                out.push({ leg: i, lower: lowerAngle, upper: upperAngle, max: Math.max(lowerAngle, upperAngle) });
            }
            return out;
        }

        function getBallJointLimitRad() {
            const el = document.getElementById('ballJointLimitInput');
            const deg = el ? Number(el.value) : 45;
            return ((Number.isFinite(deg) && deg > 0) ? deg : 45) * Math.PI / 180;
        }
        function getRodLengthTolerance() {
            const el = document.getElementById('rodLengthToleranceInput');
            const v = el ? Number(el.value) : 0.5;
            return Number.isFinite(v) && v > 0 ? v : 0.5;
        }

        function isPoseValid(pos, rot) {
            if (!platform) return { ok: true, reason: '' };
            // Save current pose
            const prevPos = platform.translation ? platform.translation.slice() : [0, 0, 0];
            const prevQ = platform.orientation || Quaternion.ONE;
            try {
                const candQ = Quaternion.fromEuler(
                    (rot.rx || 0) * Math.PI / 180,
                    (rot.ry || 0) * Math.PI / 180,
                    (rot.rz || 0) * Math.PI / 180,
                    'XYZ'
                );
                platform.update([pos.x || 0, pos.y || 0, pos.z || 0], candQ);

                // 1. Servo angle range / IK feasibility — getServoAngles returns
                //    null per leg if the IK formula has no solution (rod too
                //    short/long for this geometry) OR if α is out of servoRange.
                const angles = platform.getServoAngles && platform.getServoAngles();
                const anglesOK = Array.isArray(angles) && angles.every((a) => a !== null);

                // 2. Horn stretch — each horn tip must be exactly hornLength
                //    from its base anchor (within tolerance).
                let hornsOK = true;
                let hornBadLeg = -1;
                if (platform.B && platform.H && platform.hornLength) {
                    const tol = Math.max(1e-3 * platform.hornLength, 0.5);
                    for (let i = 0; i < platform.H.length; i++) {
                        if (Math.abs(dist3(platform.H[i], platform.B[i]) - platform.hornLength) > tol) {
                            hornsOK = false; hornBadLeg = i; break;
                        }
                    }
                }

                // 3. Rod length tolerance — the actual horn-tip-to-platform
                //    distance must equal rodLength. Catches numerical drift
                //    that getServoAngles' closed-form solver might tolerate.
                let rodsOK = true;
                let rodBadLeg = -1;
                let rodBadDelta = 0;
                if (platform.q && platform.H && platform.rodLength && anglesOK) {
                    const rodTol = getRodLengthTolerance();
                    for (let i = 0; i < platform.q.length; i++) {
                        const d = dist3(platform.q[i], platform.H[i]);
                        const delta = Math.abs(d - platform.rodLength);
                        if (delta > rodTol) {
                            rodsOK = false; rodBadLeg = i; rodBadDelta = delta; break;
                        }
                    }
                }

                // 4. Ball joint deflection — both upper (platform side) and
                //    lower (horn side) joints must stay within their cone.
                let ballsOK = true;
                let ballBadLeg = -1;
                let ballBadAngle = 0;
                let maxBallAngle = 0;
                if (anglesOK && rodsOK) {
                    const ballAngles = computeBallJointAnglesAtCurrent(candQ);
                    if (ballAngles) {
                        const limit = getBallJointLimitRad();
                        for (const ba of ballAngles) {
                            if (ba.max > maxBallAngle) maxBallAngle = ba.max;
                            if (ba.max > limit + 1e-6) {
                                ballsOK = false; ballBadLeg = ba.leg; ballBadAngle = ba.max; break;
                            }
                        }
                    }
                }

                platform.update(prevPos, prevQ);

                if (!anglesOK) return { ok: false, reason: 'servo/rod out of range' };
                if (!hornsOK)  return { ok: false, reason: `horn stretch (leg ${hornBadLeg + 1})` };
                if (!rodsOK)   return { ok: false, reason: `rod length off by ${rodBadDelta.toFixed(2)}mm (leg ${rodBadLeg + 1})` };
                if (!ballsOK)  return { ok: false, reason: `ball joint at leg ${ballBadLeg + 1}: ${(ballBadAngle * 180 / Math.PI).toFixed(0)}°` };
                return { ok: true, reason: '', maxBallAngleDeg: maxBallAngle * 180 / Math.PI };
            } catch (e) {
                try { platform.update(prevPos, prevQ); } catch (_) { }
                return { ok: false, reason: 'invalid quaternion/pose' };
            }
        }

        // ---------- Pingpong Ball controller (unchanged) ----------
        class PingBall {
            constructor(platform) {
                this.platform = platform;
                this.translation = [0, 0, 0];
                this.dtranslation = [0, 0, 0];
                this.ddtranslation = [0, 0, 0];
                this.orientation = Quaternion.ONE;
                this.x = 0; this.y = 0; this.z = 300;
                this.dx = 0; this.dy = 0; this.dz = 0;
                this.mass = 2.7 / 1000; this.r = 20;
                this.ctrl = { e: 0.80, Ht: 140, vMax: 800, aMax: 4000, zMin: 0, zMax: 30, tPlan: 0.12, tMin: 0.015 };
            }
            update() {
                const plat = this.platform;
                const zoff = (plat && plat.T0 && plat.T0[2]) ? plat.T0[2] : 0;
                const dt = 1 / 40, g = -9.81 * 100;
                let zp = this.translation[2], vzp = this.dtranslation[2], azp = this.ddtranslation[2];
                const zSurf = zp + zoff + this.r;
                const A = 0.5 * g, B = this.dz, C = this.z - zSurf;
                let tHit = null;
                if (Math.abs(A) > 0) {
                    const D = B * B - 4 * A * C;
                    if (D >= 0) {
                        const sqrtD = Math.sqrt(D);
                        const t1 = (-B - sqrtD) / (2 * A);
                        const t2 = (-B + sqrtD) / (2 * A);
                        if (t1 > 1e-6) tHit = t1; else if (t2 > 1e-6) tHit = t2;
                    }
                } else if (B < 0) { tHit = -C / B; }
                if (tHit !== null && tHit < this.ctrl.tPlan) {
                    const v_post = Math.sqrt(2 * Math.abs(g) * this.ctrl.Ht);
                    const v_pre = this.dz;
                    const e = this.ctrl.e;
                    const vp_des = (v_post + e * v_pre) / (1 + e);
                    const tH = Math.max(this.ctrl.tMin, tHit);
                    let a_cmd = (vp_des - vzp) / tH;
                    if (a_cmd > this.ctrl.aMax) a_cmd = this.ctrl.aMax;
                    if (a_cmd < -this.ctrl.aMax) a_cmd = -this.ctrl.aMax;
                    azp = a_cmd;
                } else {
                    const zMid = 0.5 * (this.ctrl.zMin + this.ctrl.zMax);
                    const w = 12, zeta = 1;
                    azp = (w * w) * (zMid - zp) + (2 * zeta * w) * (0 - vzp);
                }
                vzp += azp * dt;
                if (vzp > this.ctrl.vMax) vzp = this.ctrl.vMax;
                if (vzp < -this.ctrl.vMax) vzp = -this.ctrl.vMax;
                zp += vzp * dt;
                if (zp > this.ctrl.zMax) { zp = this.ctrl.zMax; if (vzp > 0) vzp = 0; }
                if (zp < this.ctrl.zMin) { zp = this.ctrl.zMin; if (vzp < 0) vzp = 0; }
                this.translation[2] = zp; this.dtranslation[2] = vzp; this.ddtranslation[2] = azp;
                this.dz += g * dt; this.z += this.dz * dt;
                const paddleTop = zp + zoff + this.r, vp = vzp;
                if (this.z <= paddleTop) {
                    const vrel = this.dz - vp;
                    if (vrel < 0) {
                        const vrel_post = -this.ctrl.e * vrel;
                        this.dz = vp + vrel_post;
                    }
                    this.z = paddleTop;
                }
                if (plat && typeof plat.update === 'function') plat.update(this.translation, this.orientation);
            }
        }

        // Compose base (sliders) with animation (from Stewart.Animation)
        function composePose(animT, animQ) {
            const baseQ = Quaternion.fromEuler(
                rotation.rx * Math.PI / 180,
                rotation.ry * Math.PI / 180,
                rotation.rz * Math.PI / 180,
                'XYZ'
            );
            const finalQ = (animQ || Quaternion.ONE).mul(baseQ);
            const finalT = [
                position.x + (animT ? animT[0] : 0),
                position.y + (animT ? animT[1] : 0),
                position.z + (animT ? animT[2] : 0)
            ];
            return { finalQ, finalT };
        }

        // Shrink animation safely into feasible range (only affects the animation delta)
        function clampAnimIntoIK(basePose, animT, animQ) {
            if (!ikClampAnimEnabled) return { T: animT, Q: animQ, ok: true };
            let lo = 0, hi = 1, bestS = 0, ok = false;
            for (let i = 0; i < 12; i++) {
                const s = (lo + hi) * 0.5;
                const qScaled = animQ.slerp(Quaternion.ONE)(1 - s);
                const tScaled = [animT[0] * s, animT[1] * s, animT[2] * s];
                const finalRes = isPoseValid(
                    { x: basePose.x + tScaled[0], y: basePose.y + tScaled[1], z: basePose.z + tScaled[2] },
                    { rx: rotation.rx, ry: rotation.ry, rz: rotation.rz }
                );
                if (finalRes.ok) { ok = true; bestS = s; lo = s; } else { hi = s; }
            }
            const s = ok ? bestS : 0;
            const qScaled = animQ.slerp(Quaternion.ONE)(1 - s);
            const tScaled = [animT[0] * s, animT[1] * s, animT[2] * s];
            return { T: tScaled, Q: qScaled, ok };
        }

        // ---------- p5 sketch ----------
        let mouseZ = 0;
        const sketch = (p) => {
            p.setup = () => {
                const cnv = p.createCanvas(746, 746, p.WEBGL);
                cnv.parent('canvas');
                p.camera(0, -300, 500, 0, 0, 0, 0, 1, 0);

                // wheel -> mapped axes when Keyboard pattern is active
                p.canvas.addEventListener('wheel', (e) => {
                    if (uiAnim.pattern === 'keyboard') {
                        for (const axis in axisMap) {
                            if (axisMap[axis] === 'wheel') {
                                const isRot = axis.startsWith('r');
                                const factor = isRot ? rFactor : tFactor;
                                const obj = isRot ? rotation : position;
                                attemptMove(obj, axis, clamp(-e.deltaY * factor, -9999, 9999));
                            }
                        }
                    }
                }, { passive: true });

                rebuildPlatform();
                const res = isPoseValid(position, rotation);
                setIKStatus(res.ok, res.reason, res.ok ? res : null);
            };

            // Book-keeping for last good pose to avoid “freeze”
            let lastGood = { T: [0, 0, 0], Q: Quaternion.ONE };

            p.draw = () => {
                p.background(60);
                p.push();
                p.translate(0, 100, 0);
                p.rotateX(view.x * Math.PI / 180); p.rotateY(view.y * Math.PI / 180); p.rotateZ(view.z * Math.PI / 180);

                // ----- Get animation delta from Stewart.Animation or custom patterns -----
                let animT = [0, 0, 0], animQ = Quaternion.ONE;
                if (uiAnim.playing) {
                    if (uiAnim.pattern === 'pingpong' && ball) {
                        ball.update();
                        animT = ball.translation.slice();
                        animQ = ball.orientation || Quaternion.ONE;
                    } else if (animator && animator.cur) {
                        const tNow = performance.now();
                        const dur = (animator.cur.duration || 0) * uiAnim.periodScale;
                        let pct = 0;
                        if (dur === 0) {
                            animator.cur.fn.call(animator, 0, p);
                        } else {
                            pct = ((tNow - (uiAnim.startMs || tNow)) % dur) / dur;
                            animator.cur.fn.call(animator, pct, p);
                            if (pct >= 0.9999 && animator.next) {
                                animator.start(animator.next);
                                uiAnim.startMs = performance.now();
                            }
                        }
                        animT = animator.translation.slice();
                        animQ = animator.orientation || Quaternion.ONE;
                        if (uiAnim.pattern === 'keyboard') {
                            // preserve Z offset if needed
                            animT[2] = mouseZ;
                        }
                    }
                }

                // ----- Compose base with animation -----
                const basePose = { x: position.x, y: position.y, z: position.z };
                let composed = composePose(animT, animQ);

                // Safety clamp for anims when enabled
                if (ikClampEnabled && ikClampAnimEnabled && uiAnim.playing) {
                    const res = isPoseValid(
                        { x: basePose.x + animT[0], y: basePose.y + animT[1], z: basePose.z + animT[2] },
                        rotation
                    );
                    if (!res.ok) {
                        const shrunk = clampAnimIntoIK(basePose, animT, animQ);
                        animT = shrunk.T; animQ = shrunk.Q;
                        composed = composePose(animT, animQ);
                    }
                }

                // Try to apply; fall back only if update fails or clamps are enabled
                let updateSucceeded = true;
                try { platform.update(composed.finalT, composed.finalQ); } catch (e) { updateSucceeded = false; }
                let anglesOK = true;
                if (updateSucceeded && platform.getServoAngles) {
                    const angs = platform.getServoAngles();
                    anglesOK = Array.isArray(angs) && angs.every(a => a !== null);
                }
                if (!updateSucceeded || (ikClampEnabled && !anglesOK)) {
                    try { platform.update(lastGood.T, lastGood.Q); } catch (_) { }
                    setIKStatus(false, 'servo/rod out of range');
                } else {
                    lastGood = { T: composed.finalT.slice(), Q: composed.finalQ.clone() };
                    setIKStatus(anglesOK, anglesOK ? '' : 'servo/rod out of range');
                }

                // Draw platform and optional paths
                platform.draw(p);
                if (animator && animator.drawPath) animator.drawPath(p);
                // Draw colored markers on each servo base to match the servo angle list
                if (typeof drawServoMarkers === 'function') {
                    drawServoMarkers(p);
                }

                // Pingpong ball viz: keep the ball's bounce anchored to the platform's
                // translation in X and Y so that it follows the platform when you move it.
                if (uiAnim.playing && uiAnim.pattern === 'pingpong' && ball) {
                    ball.x = position.x;
                    ball.y = position.y;
                    p.push(); p.noStroke(); p.fill(255, 220, 80);
                    p.translate(ball.x || 0, ball.y || 0, ball.z || 0);
                    p.sphere(ball.r || 20); p.pop();
                }

                // Update servo angles display
                if (typeof updateServoAnglesUI === 'function') updateServoAnglesUI();

                p.pop();

                // Reflect the *displayed* pose to the right-hand controls (UI only)
                reflectToUI(lastGood.T, lastGood.Q);
            };
        };
        new p5(sketch);

        // ---------- Platform & Animator ----------
        // When a layout has been received from the optimizer (via URL hash
        // or postMessage), importedLayout holds the per-anchor coordinates.
        // Stewart.init() accepts a custom getLegs callback, which lets us
        // bypass the parametric initHexagonal() and use the optimizer's
        // arbitrary 6-anchor geometry verbatim.
        let importedLayout = null;

        function rebuildPlatform() {
            platform = new Stewart();
            if (importedLayout
                && Array.isArray(importedLayout.base_anchors)
                && importedLayout.base_anchors.length === 6
                && Array.isArray(importedLayout.platform_anchors)
                && importedLayout.platform_anchors.length === 6
                && Array.isArray(importedLayout.beta_angles)
                && importedLayout.beta_angles.length === 6) {
                const L = importedLayout;
                platform.init({
                    rodLength: Number(L.rod_length) || opts.rodLength,
                    hornLength: Number(L.horn_length) || opts.hornLength,
                    hornDirection: opts.hornDirection,
                    drawBasePlate: true,
                    drawPlatformPlate: true,
                    servoRange: opts.servoRange,
                    servoRangeVisible: true,
                    getLegs: function () {
                        return L.base_anchors.map((b, i) => ({
                            baseJoint: b.slice(),
                            platformJoint: L.platform_anchors[i].slice(),
                            motorRotation: L.beta_angles[i],
                        }));
                    },
                });
            } else {
                platform.initHexagonal(opts);
            }
            if (Array.isArray(opts.servoRange)) platform.servoRange = opts.servoRange.slice();

            // Stewart.Animation for RAW‑exact motion
            animator = new Stewart.Animation(platform);

            /*
             * Build a continuous helical sweep that loops without any Z‑height jump.
             * The stock Stewart.js library defines a helical pattern that goes
             * downwards and then resets back to the top, which causes a
             * discontinuity.  To eliminate the jump, override the default
             * animation function with one that oscillates the Z position using
             * a cosine.  At pct=0 the platform is at the top (Z=20), at pct=0.5
             * it reaches the bottom (Z=0), and at pct=1 it returns to the top
             * (Z=20) again.  The helical function loops on itself (next = 'helical'),
             * and any previous helical2 definitions are removed so they do not
             * interfere with our continuous path.
             */
            if (animator.fn && animator.fn.helical) {
                animator.fn.helical.fn = function (pct) {
                    // Four full rotations (8π radians) per cycle
                    const theta = pct * Math.PI * 8;
                    // Oscillate Z smoothly between 0 and 20 using a cosine
                    const zOff = 10 + 10 * Math.cos(2 * Math.PI * pct);
                    this.translation = [Math.cos(theta) * 20, Math.sin(theta) * 20, zOff];
                    this.orientation = Quaternion.ONE;
                };
                // Loop the pattern back to itself.  Without this, the default
                // pattern system would look for a helical2 entry and fall back
                // to wobble on completion.
                animator.fn.helical.next = 'helical';
                // Remove the alternate helical2 pattern if it exists.  The
                // continuous helical sweep does not need a second phase, and
                // leaving helical2 defined would reintroduce a discontinuity.
                if (animator.fn.helical2) {
                    animator.fn.helical2 = undefined;
                }
                // Ensure the helical pattern’s path is visible by default
                animator.fn.helical.pathVisible = true;
            }

            // Override drawPath to include base translation and orientation in the path
            animator.drawPath = function (p) {
                // Only draw if the path is marked visible and the current pattern allows it
                if (!this.pathVisible || !(this.cur && this.cur.pathVisible)) return;
                const steps = 100;
                p.beginShape();
                p.noFill();
                p.stroke(255, 0, 0);
                // Save the current animation state
                const origTrans = this.translation.slice();
                const origOrient = this.orientation.clone();
                const origCur = this.cur;
                // Sample the pattern path
                for (let i = 0; i <= steps; i++) {
                    this.cur.fn.call(this, i / steps, p);
                    const composed = composePose(this.translation, this.orientation);
                    const finalT = composed.finalT;
                    // Add the platform base translation (T0) to the composed translation so
                    // that the path is drawn at the correct world height (above the base).
                    const t0 = (platform && platform.T0) ? platform.T0 : [0, 0, 0];
                    const worldT = [
                        finalT[0] + t0[0],
                        finalT[1] + t0[1],
                        finalT[2] + t0[2]
                    ];
                    p.vertex(worldT[0], worldT[1], worldT[2]);
                }
                // Restore the original state
                this.translation = origTrans;
                this.orientation = origOrient;
                this.cur = origCur;
                p.endShape();
            };

            // After rebuild, capture home rod reference for ball joint checks.
            captureHomeRodReference();
        }

        // ---------- Left panel (mechanical) ----------
        function bindLeft(sliderId, inputId, resetId, key, defVal) {
            const s = document.getElementById(sliderId), n = document.getElementById(inputId), r = document.getElementById(resetId);
            const apply = (v) => {
                const val = clamp(Math.round(v), +s.min, +s.max);
                s.value = val; n.value = val; opts[key] = val; rebuildPlatform();
            };
            s.oninput = () => apply(+s.value); n.onchange = () => apply(+n.value); r.onclick = () => apply(defVal);
        }
        bindLeft("rodLengthSlider", "rodLengthInput", "rodLengthReset", "rodLength", 130);
        bindLeft("hornLengthSlider", "hornLengthInput", "hornLengthReset", "hornLength", 50);
        bindLeft("baseRadiusSlider", "baseRadiusInput", "baseRadiusReset", "baseRadius", 80);
        bindLeft("platformRadiusSlider", "platformRadiusInput", "platformRadiusReset", "platformRadius", 50);
        bindLeft("anchorDistanceSlider", "anchorDistanceInput", "anchorDistanceReset", "anchorDistance", 40);
        bindLeft("shaftDistanceSlider", "shaftDistanceInput", "shaftDistanceReset", "shaftDistance", 30);
        document.getElementById("platformTurnCheckbox").onchange = e => {
            opts.platformTurn = e.target.checked;
            rebuildPlatform();
            // Stop any running animation to prevent the ghost wobble bug
            pause();
            setToggleUI(false);
            uiAnim.pattern = 'none';
        };
        document.getElementById("hornDirCheckbox").onchange = e => {
            opts.hornDirection = e.target.checked;
            rebuildPlatform();
            // Stop any running animation to prevent the ghost wobble bug
            pause();
            setToggleUI(false);
            uiAnim.pattern = 'none';
        };
        function updateServoRange() {
            const minDeg = parseFloat(document.getElementById("servoMinInput").value) || -90;
            const maxDeg = parseFloat(document.getElementById("servoMaxInput").value) || 90;
            opts.servoRange = [minDeg * Math.PI / 180, maxDeg * Math.PI / 180];
            if (platform) platform.servoRange = opts.servoRange.slice();
        }
        document.getElementById("servoMinInput").onchange = updateServoRange;
        document.getElementById("servoMaxInput").onchange = updateServoRange;
        document.getElementById("servoRangeReset").onclick = () => { document.getElementById("servoMinInput").value = -90; document.getElementById("servoMaxInput").value = 90; updateServoRange(); };

        // ---------- View (updated mapping/range) ----------
        const viewXSlider = document.getElementById('viewXSlider'), viewXInput = document.getElementById('viewXInput');
        const viewYSlider = document.getElementById('viewYSlider'), viewYInput = document.getElementById('viewYInput');
        const viewZSlider = document.getElementById('viewZSlider'), viewZInput = document.getElementById('viewZInput');
        function setViewX(v) {
            const raw = +v || 0;
            const min = +viewXSlider.min, max = +viewXSlider.max;
            const disp = clamp(raw, min, max);
            // Observed actual angle = 135° − view.x. To make the displayed slider
            // equal to the actual rendered angle, invert the mapping: internal
            // rotation is 135 minus the slider value.
            const internal = 135 - disp;
            view.x = normDeg(internal);
            viewXSlider.value = disp;
            viewXInput.value = disp;
        }
        function setViewY(v) { view.y = normDeg(v); viewYSlider.value = view.y; viewYInput.value = view.y; }
        function setViewZ(v) { view.z = normDeg(v); viewZSlider.value = view.z; viewZInput.value = view.z; }
        viewXSlider.oninput = () => setViewX(viewXSlider.value); viewXInput.onchange = () => setViewX(viewXInput.value);
        viewYSlider.oninput = () => setViewY(viewYSlider.value); viewYInput.onchange = () => setViewY(viewYInput.value);
        viewZSlider.oninput = () => setViewZ(viewZSlider.value); viewZInput.onchange = () => setViewZ(viewZInput.value);
        document.getElementById('viewXReset').onclick = () => setViewX(45);
        document.getElementById('viewYReset').onclick = () => setViewY(0);
        document.getElementById('viewZReset').onclick = () => setViewZ(0);

        // ---------- Safety toggles ----------
        document.getElementById("ikClampCheckbox").onchange = e => { ikClampEnabled = e.target.checked; };
        document.getElementById("ikClampAnimCheckbox").onchange = e => { ikClampAnimEnabled = e.target.checked; };
        // Live re-check when safety limits change
        const refreshSafetyStatus = () => {
            const result = isPoseValid(position, rotation);
            setIKStatus(result.ok, result.reason, result.ok ? result : null);
        };
        const ballLimEl = document.getElementById('ballJointLimitInput');
        const rodTolEl = document.getElementById('rodLengthToleranceInput');
        if (ballLimEl) ballLimEl.addEventListener('input', refreshSafetyStatus);
        if (rodTolEl)  rodTolEl.addEventListener('input', refreshSafetyStatus);

        // ---------- Right panel wiring ----------
        const programmatic = { on: false };
        function flashBlocked(el) { el.classList.remove('blocked'); void el.offsetWidth; el.classList.add('blocked'); }

        function connectAxis({ minusBtn, plusBtn, slider, input, resetBtn, obj, key, step }) {
            const s = document.getElementById(slider), i = document.getElementById(input);
            const bMinus = document.getElementById(minusBtn), bPlus = document.getElementById(plusBtn), bReset = document.getElementById(resetBtn);
            const min = +s.min, max = +s.max;

            function attempt(val, sourceEl) {
                // Keep fractional values; do not round, so that fine increments like 0.1 work.
                val = clamp(val, min, max);
                const prev = obj[key] ?? 0;

                if (ikClampEnabled) {
                    const candPos = { ...position }, candRot = { ...rotation };
                    if (obj === position) candPos[key] = val; else candRot[key] = val;
                    const res = isPoseValid(candPos, candRot);
                    if (!res.ok) {
                        programmatic.on = true; s.value = prev; i.value = prev; programmatic.on = false;
                        flashBlocked(sourceEl || s); setIKStatus(false, res.reason); return;
                    }
                }

                obj[key] = val;
                programmatic.on = true; s.value = val; i.value = val; programmatic.on = false;
            }

            bMinus.onclick = () => attempt((obj[key] ?? 0) - step, bMinus);
            bPlus.onclick = () => attempt((obj[key] ?? 0) + step, bPlus);
            bReset.onclick = () => attempt(0, bReset);
            s.oninput = () => { if (!programmatic.on) attempt(+s.value, s); };
            i.onchange = () => { if (!programmatic.on) attempt(+i.value, i); };
        }
        connectAxis({ minusBtn: "xMinus", plusBtn: "xPlus", slider: "xSlider", input: "xInput", resetBtn: "xReset", obj: position, key: "x", step: stepPos });
        connectAxis({ minusBtn: "yMinus", plusBtn: "yPlus", slider: "ySlider", input: "yInput", resetBtn: "yReset", obj: position, key: "y", step: stepPos });
        connectAxis({ minusBtn: "zMinus", plusBtn: "zPlus", slider: "zSlider", input: "zInput", resetBtn: "zReset", obj: position, key: "z", step: stepPos });
        connectAxis({ minusBtn: "rxMinus", plusBtn: "rxPlus", slider: "rxSlider", input: "rxInput", resetBtn: "rxReset", obj: rotation, key: "rx", step: stepRot });
        connectAxis({ minusBtn: "ryMinus", plusBtn: "ryPlus", slider: "rySlider", input: "ryInput", resetBtn: "ryReset", obj: rotation, key: "ry", step: stepRot });
        connectAxis({ minusBtn: "rzMinus", plusBtn: "rzPlus", slider: "rzSlider", input: "rzInput", resetBtn: "rzReset", obj: rotation, key: "rz", step: stepRot });

        // UI reflection of the *displayed* pose (does not overwrite base state)
        function reflectToUI(finalT, finalQ) {
            const m = finalQ.toMatrix4();
            let pitchY = Math.asin(clamp(m[2], -1, 1)); // r13
            let rollX, yawZ;

            if (Math.abs(Math.cos(pitchY)) > 1e-6) {
                rollX = Math.atan2(-m[6], m[10]);
                yawZ = Math.atan2(-m[1], m[0]);
            } else {
                yawZ = 0; rollX = Math.atan2(m[4], m[5]);
            }

            const disp = {
                x: Math.round(finalT[0]), y: Math.round(finalT[1]), z: Math.round(finalT[2]),
                rx: Math.round(rollX * 180 / Math.PI),
                ry: Math.round(pitchY * 180 / Math.PI),
                rz: Math.round(yawZ * 180 / Math.PI)
            };
            const pairs = [
                ['x', 'xSlider', 'xInput', disp.x],
                ['y', 'ySlider', 'yInput', disp.y],
                ['z', 'zSlider', 'zInput', disp.z],
                ['rx', 'rxSlider', 'rxInput', disp.rx],
                ['ry', 'rySlider', 'ryInput', disp.ry],
                ['rz', 'rzSlider', 'rzInput', disp.rz],
            ];
            programmatic.on = true;
            for (const [k, sl, inId, val] of pairs) {
                const s = document.getElementById(sl), i = document.getElementById(inId);
                if (!s || !i) continue;
                const clamped = clamp(val, +s.min, +s.max);
                s.value = clamped; i.value = clamped;
            }
            programmatic.on = false;
        }

        // ---------- Animation controls ----------
        const patternSel = document.getElementById("animationPatternSelect");
        const speedSlider = document.getElementById("animationSpeedSlider");
        const speedVal = document.getElementById("speedVal");
        const animToggle = document.getElementById("animToggle");

        function setToggleUI(on) {
            uiAnim.playing = !!on;
            animToggle.setAttribute("aria-pressed", on ? "true" : "false");
            animToggle.classList.toggle("playing", on);
            animToggle.querySelector(".label").textContent = on ? "Pause" : "Play";
        }
        function applySpeed() {
            const pct = Math.max(10, Math.min(300, +speedSlider.value || 100));
            uiAnim.pct = pct;
            speedVal.textContent = `${Math.round(pct)}%`;
        }
        speedSlider.oninput = applySpeed; applySpeed();

        const ballApexSlider = document.getElementById('ballApexSlider');
        const ballApexInput = document.getElementById('ballApexInput');
        const ballApexReset = document.getElementById('ballApexReset');
        function setBallApex(v) {
            if (!ballApexSlider || !ballApexInput) return;
            const min = parseFloat(ballApexSlider.min) || 50;
            const max = parseFloat(ballApexSlider.max) || 300;
            let val = parseFloat(v);
            if (isNaN(val)) val = min;
            val = Math.min(max, Math.max(min, val));
            ballApexSlider.value = val;
            ballApexInput.value = val;
            if (ball) ball.ctrl.Ht = val;
        }
        if (ballApexSlider) { ballApexSlider.oninput = () => setBallApex(ballApexSlider.value); }
        if (ballApexInput) { ballApexInput.onchange = () => setBallApex(ballApexInput.value); }
        if (ballApexReset) { ballApexReset.onclick = () => setBallApex(140); }

        function startPattern(name) {
            const map = { wobble: 'wobble', rotate: 'rotate', tilt: 'tilt', keyboard: 'keyboard', gamepad: 'gamepad', helical: 'helical', pingpong: 'pingpong', none: 'none' };
            // Update the active pattern based on the requested name.
            uiAnim.pattern = map[name] || 'none';

            // Show/hide the keyboard control panel based on the selected pattern.
            const kbPanel = document.getElementById('keyboardPanel');
            if (kbPanel) kbPanel.style.display = (uiAnim.pattern === 'keyboard') ? '' : 'none';

            // If no pattern is selected, stop playback and return early.
            if (uiAnim.pattern === 'none') {
                pause();
                setToggleUI(false);
                return;
            }

            // Ensure the platform and animator exist.  A null check on animator is
            // necessary because rebuilding the platform resets animator.
            if (platform && !animator) animator = new Stewart.Animation(platform);
            if (!platform) rebuildPlatform();

            // Show or hide the pingpong controls depending on the pattern and
            // initialize/reset the pingpong ball state appropriately.
            const ppCtrl = document.getElementById('pingpongControls');
            if (uiAnim.pattern === 'pingpong') {
                if (ppCtrl) ppCtrl.style.display = '';
                if (!ball) { ball = new PingBall(platform); }
                const apexEl = document.getElementById('ballApexSlider');
                const apexVal = apexEl ? parseFloat(apexEl.value) : ball.ctrl.Ht;
                if (!isNaN(apexVal)) ball.ctrl.Ht = apexVal;
            } else {
                if (ppCtrl) ppCtrl.style.display = 'none';
                ball = null;
            }

            // Special handling for the keyboard pattern: we do not want to leave any
            // residual animation state active.  If a previous pattern was running
            // then its function would still live in animator.cur and would run
            // whenever uiAnim.playing is true.  To avoid this, clear the current
            // animation state.
            if (uiAnim.pattern === 'keyboard') {
                if (animator) {
                    animator.cur = null;
                    animator.next = null;
                }
            } else {
                // For other patterns, start the requested Stewart.Animation pattern.
                if (animator) {
                    animator.start(uiAnim.pattern);
                }
            }

            // Set path visibility only after starting the pattern.  If pathVisible
            // were set before calling start(), it might be overwritten by the
            // animation start routine.  Only the helical pattern should have a
            // visible traced path.
            if (animator) {
                const showPath = (uiAnim.pattern === 'helical');
                animator.pathVisible = showPath;
                if (animator.cur) animator.cur.pathVisible = showPath;
            }

            // Record the start time for animation timing and mark as playing.  For
            // keyboard mode, marking as playing has no effect on key handling
            // because updateControls uses the pattern itself to decide whether
            // to process key input.
            uiAnim.startMs = performance.now();
            setToggleUI(true);
        }

        // When toggling play/pause, always start the currently selected pattern stored
        // in uiAnim.pattern rather than reading the dropdown.  This prevents a
        // previously-selected animation from inadvertently starting when the
        // keyboard pattern is active and the user presses Play.
        animToggle.onclick = () => {
            if (uiAnim.playing) {
                pause();
                setToggleUI(false);
            } else {
                startPattern(uiAnim.pattern);
            }
        };
        patternSel.onchange = () => {
            // Always update the active pattern when the dropdown changes.  Without
            // this assignment the Play button will continue to reference the
            // previously selected pattern and inadvertently restart it.
            uiAnim.pattern = patternSel.value;
            if (uiAnim.playing) {
                // If an animation is currently playing, immediately restart
                // the newly selected pattern so there is no overlap between
                // animations.  This also ensures that the helical tracer
                // visibility flag is updated correctly via startPattern().
                startPattern(patternSel.value);
            } else {
                // When not playing, update the keyboard panel visibility
                // based on the selected pattern.  We avoid calling
                // startPattern() here so that the user can prepare the next
                // pattern without starting it prematurely.  However, we must
                // update the path visibility to prevent a lingering helical
                // trace from persisting after switching patterns.
                const kbPanel = document.getElementById('keyboardPanel');
                if (kbPanel) {
                    kbPanel.style.display = (patternSel.value === 'keyboard') ? '' : 'none';
                }
                // Toggle the helical sweep tracer path: enable it only when
                // the helical pattern is selected and disabled otherwise.
                if (animator) {
                    const showPath = (patternSel.value === 'helical');
                    animator.pathVisible = showPath;
                    if (animator.cur) animator.cur.pathVisible = showPath;
                }
            }
        };

        // Keys: Space for play/pause, [ ] for view roll (left-side only)
        document.addEventListener('keydown', (e) => {
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            const isTyping = /INPUT|TEXTAREA|SELECT/.test(tag);
            if (!isTyping && e.code === 'Space') { e.preventDefault(); animToggle.click(); }
            if (!isTyping && (e.key === '[' || e.key === ']')) { setViewZ(view.z + (e.key === ']' ? 5 : -5)); }
        });

        // ---------- NEW: Gamepad-style input (keys + mouse) ----------
        const keysPressed = {};
        const keyBindings = {
            xPos: null, xNeg: null,
            yPos: null, yNeg: null,
            zPos: null, zNeg: null,
            rxPos: null, rxNeg: null,
            ryPos: null, ryNeg: null,
            rzPos: null, rzNeg: null
        };

        // Defaults (you can change these in UI by rebinding)
        keyBindings.xPos = 'KeyD'; keyBindings.xNeg = 'KeyA';
        // Swap the Y axis defaults: S increases Y, W decreases Y.
        keyBindings.yPos = 'KeyS'; keyBindings.yNeg = 'KeyW';
        keyBindings.zPos = 'Equal'; keyBindings.zNeg = 'Minus';
        keyBindings.rxPos = 'ArrowUp'; keyBindings.rxNeg = 'ArrowDown';
        keyBindings.ryPos = 'ArrowRight'; keyBindings.ryNeg = 'ArrowLeft';
        keyBindings.rzPos = 'KeyE'; keyBindings.rzNeg = 'KeyQ';

        function keysBindingsActive(code) { return Object.values(keyBindings).includes(code); }
        function displayBoundKey(buttonId, code) { const btn = document.getElementById(buttonId); btn.textContent = code ? `[${code}]` : '[None]'; }
        function bindKey(buttonId, bindingName) {
            const btn = document.getElementById(buttonId);
            displayBoundKey(buttonId, keyBindings[bindingName]);
            btn.onclick = () => {
                btn.textContent = '...';
                function captureKey(e) {
                    const tag = (document.activeElement && document.activeElement.tagName) || '';
                    if (/INPUT|TEXTAREA|SELECT/.test(tag)) { return; }
                    keyBindings[bindingName] = e.code;
                    displayBoundKey(buttonId, e.code);
                    window.removeEventListener('keydown', captureKey);
                    e.preventDefault();
                }
                window.addEventListener('keydown', captureKey);
            };
        }

        // Wire all keybinding buttons
        bindKey('bindXPos', 'xPos'); bindKey('bindXNeg', 'xNeg');
        bindKey('bindYPos', 'yPos'); bindKey('bindYNeg', 'yNeg');
        bindKey('bindZPos', 'zPos'); bindKey('bindZNeg', 'zNeg');
        bindKey('bindRXPos', 'rxPos'); bindKey('bindRXNeg', 'rxNeg');
        bindKey('bindRYPos', 'ryPos'); bindKey('bindRYNeg', 'ryNeg');
        bindKey('bindRZPos', 'rzPos'); bindKey('bindRZNeg', 'rzNeg');

        // Sensitivity inputs
        const transStepInputEl = document.getElementById('transStepInput');
        const rotStepInputEl = document.getElementById('rotStepInput');
        transStepInputEl.onchange = () => { const v = +transStepInputEl.value; if (!isNaN(v)) stepPos = v; };
        rotStepInputEl.onchange = () => { const v = +rotStepInputEl.value; if (!isNaN(v)) stepRot = v; };

        // Axis mapping for mouse control
        // Fixed sensitivity factors for translation (tFactor) and rotation (rFactor)
        const tFactor = 0.5, rFactor = 0.2;
        // Provide sensible defaults for mouse input.  By default, translation axes
        // are unmapped ('off') so only keyboard inputs move the platform in X/Y/Z.
        // Rotation axes can be controlled by the mouse: vertical drag (mouseY)
        // rotates about X, horizontal drag (mouseX) rotates about Y, and the
        // scroll wheel rotates about Z.  Users can change these via the
        // dropdowns in Keyboard mode.
        const axisMap = {
            // Default mouse bindings for six degrees of freedom.  Translation axes
            // (X, Y, Z) are set to 'off' by default so movement comes from
            // keyboard bindings only.  Rotation axes use the mouse:
            //   rx: vertical mouse drag (mouseY)
            //   ry: horizontal mouse drag (mouseX)
            //   rz: scroll wheel
            x: 'off',
            y: 'off',
            z: 'off',
            rx: 'mouseY',
            ry: 'mouseX',
            rz: 'wheel'
        };
        // Wiring select events for each axis
        const axisMapXEl = document.getElementById('axisMapX');
        if (axisMapXEl) axisMapXEl.onchange = (e) => { axisMap.x = e.target.value; };
        // Reflect default mapping into the dropdown so the UI shows the current mapping
        if (axisMapXEl) axisMapXEl.value = axisMap.x;
        const axisMapYEl = document.getElementById('axisMapY');
        if (axisMapYEl) axisMapYEl.onchange = (e) => { axisMap.y = e.target.value; };
        if (axisMapYEl) axisMapYEl.value = axisMap.y;
        const axisMapZEl = document.getElementById('axisMapZ');
        if (axisMapZEl) axisMapZEl.onchange = (e) => { axisMap.z = e.target.value; };
        if (axisMapZEl) axisMapZEl.value = axisMap.z;
        const axisMapRXEl = document.getElementById('axisMapRX');
        if (axisMapRXEl) axisMapRXEl.onchange = (e) => { axisMap.rx = e.target.value; };
        if (axisMapRXEl) axisMapRXEl.value = axisMap.rx;
        const axisMapRYEl = document.getElementById('axisMapRY');
        if (axisMapRYEl) axisMapRYEl.onchange = (e) => { axisMap.ry = e.target.value; };
        if (axisMapRYEl) axisMapRYEl.value = axisMap.ry;
        const axisMapRZEl = document.getElementById('axisMapRZ');
        if (axisMapRZEl) axisMapRZEl.onchange = (e) => { axisMap.rz = e.target.value; };
        if (axisMapRZEl) axisMapRZEl.value = axisMap.rz;

        // Global key state
        function onKeyEvent(e) {
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
            keysPressed[e.code] = (e.type === 'keydown');
            if (keysBindingsActive(e.code)) e.preventDefault();
        }
        window.addEventListener('keydown', onKeyEvent);
        window.addEventListener('keyup', onKeyEvent);

        // Shared attemptMove used by continuous loop & mouse
        function attemptMove(obj, key, delta) {
            const sliderId = key + 'Slider', inputId = key + 'Input';
            const s = document.getElementById(sliderId), i = document.getElementById(inputId);
            if (!s || !i) return;
            const min = +s.min, max = +s.max;
            const current = obj[key] || 0;
            // Do not round to allow fine control (e.g. 0.1 increments).
            const targetVal = clamp(current + delta, min, max);
            if (targetVal === current) return;

            if (ikClampEnabled) {
                const candPos = { ...position }, candRot = { ...rotation };
                if (obj === position) candPos[key] = targetVal; else candRot[key] = targetVal;
                const result = isPoseValid(candPos, candRot);
                if (!result.ok) { flashBlocked(s); setIKStatus(false, result.reason); return; }
                // Update status with the new max ball joint angle
                setIKStatus(true, '', result);
            }
            obj[key] = targetVal;
            programmatic.on = true; s.value = targetVal; i.value = targetVal; programmatic.on = false;
            if (!ikClampEnabled) {
                const result = isPoseValid(position, rotation);
                setIKStatus(result.ok, result.reason, result.ok ? result : null);
            }
        }

        // Continuous update loop (runs also in Keyboard mode even if playing)
        function updateControls() {
            // Only process key-driven translation and rotation when the Keyboard pattern is active
            if (uiAnim.pattern === 'keyboard') {
                // Translation
                if (keyBindings.xPos && keysPressed[keyBindings.xPos]) attemptMove(position, 'x', +stepPos);
                if (keyBindings.xNeg && keysPressed[keyBindings.xNeg]) attemptMove(position, 'x', -stepPos);
                if (keyBindings.yPos && keysPressed[keyBindings.yPos]) attemptMove(position, 'y', +stepPos);
                if (keyBindings.yNeg && keysPressed[keyBindings.yNeg]) attemptMove(position, 'y', -stepPos);
                if (keyBindings.zPos && keysPressed[keyBindings.zPos]) attemptMove(position, 'z', +stepPos);
                if (keyBindings.zNeg && keysPressed[keyBindings.zNeg]) attemptMove(position, 'z', -stepPos);
                // Rotation
                if (keyBindings.rxPos && keysPressed[keyBindings.rxPos]) attemptMove(rotation, 'rx', +stepRot);
                if (keyBindings.rxNeg && keysPressed[keyBindings.rxNeg]) attemptMove(rotation, 'rx', -stepRot);
                if (keyBindings.ryPos && keysPressed[keyBindings.ryPos]) attemptMove(rotation, 'ry', +stepRot);
                if (keyBindings.ryNeg && keysPressed[keyBindings.ryNeg]) attemptMove(rotation, 'ry', -stepRot);
                if (keyBindings.rzPos && keysPressed[keyBindings.rzPos]) attemptMove(rotation, 'rz', +stepRot);
                if (keyBindings.rzNeg && keysPressed[keyBindings.rzNeg]) attemptMove(rotation, 'rz', -stepRot);
            }
            requestAnimationFrame(updateControls);
        }
        requestAnimationFrame(updateControls);

        // Mouse drag → mapped translate or rotate (active only when Keyboard panel shown)
        const canvasContainer = document.getElementById('canvas');
        let mouseDragging = false, lastX = 0, lastY = 0;
        canvasContainer.addEventListener('mousedown', (e) => {
            const tag = (e.target && e.target.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag)) return;
            mouseDragging = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault();
        });
        window.addEventListener('mouseup', () => { mouseDragging = false; });
        window.addEventListener('mouseleave', () => { mouseDragging = false; });
        window.addEventListener('mousemove', (e) => {
            if (!mouseDragging) return;
            if (uiAnim.pattern !== 'keyboard') return; // only in Keyboard mode
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX; lastY = e.clientY;
            if (dx !== 0 || dy !== 0) {
                for (const axis in axisMap) {
                    const mapping = axisMap[axis];
                    if (mapping === 'mouseX' && dx) {
                        const isRot = axis.startsWith('r');
                        const factor = isRot ? rFactor : tFactor;
                        const obj = isRot ? rotation : position;
                        attemptMove(obj, axis, dx * factor);
                    }
                    if (mapping === 'mouseY' && dy) {
                        const isRot = axis.startsWith('r');
                        const factor = isRot ? rFactor : tFactor;
                        const obj = isRot ? rotation : position;
                        attemptMove(obj, axis, -dy * factor);
                    }
                }
            }
        });

        // ---------- Servo angles UI ----------
        function updateServoAnglesUI() {
            const list = document.querySelectorAll('#servoAnglesList li span');
            if (!platform || !platform.getServoAngles || list.length < 6) return;
            const angs = platform.getServoAngles();
            // Collect the raw degrees for streaming.  Use null for invalid entries.
            const degArray = [];
            for (let i = 0; i < 6; i++) {
                const a = angs && angs[i];
                // Convert radians to degrees when defined.
                const rawDeg = (a === null || a === undefined) ? null : (a * 180 / Math.PI);
                // Populate the array for transmission (null entries will be replaced with zero when sending).
                degArray.push(rawDeg);
                // Format for display: two decimal places when defined.
                if (rawDeg === null) {
                    list[i].textContent = '—';
                } else {
                    list[i].textContent = rawDeg.toFixed(2) + '°';
                }
                // Apply color coding to match the servo markers in the canvas
                if (list[i].style) {
                    list[i].style.color = servoColors[i] || '';
                }
            }
            // Stream the servo angles over serial if a connection is active.  The
            // sendServoAngles helper will handle the null entries and negate
            // every second servo to account for mirrored mounting.
            if (typeof sendServoAngles === 'function') {
                sendServoAngles(degArray);
            }
        }

        // Draw colored spheres at each servo base (the platform.B positions). These
        // markers make it easy to see which servo corresponds to which entry in the
        // servo angle list.
        function drawServoMarkers(p) {
            if (!platform || !platform.B) return;
            p.push();
            p.noStroke();
            for (let i = 0; i < platform.B.length; i++) {
                const col = servoColors[i] || '#ffffff';
                const c = p.color(col);
                p.fill(c);
                p.push();
                const joint = platform.B[i];
                // Draw marker directly at the joint position.  Platform.B positions
                // already incorporate the base offset and any translation, so no
                // additional adjustment is necessary.
                p.translate(joint[0], joint[1], joint[2]);
                p.sphere(4);
                p.pop();
            }
            p.pop();
        }

        // ---------- Global reset (RIGHT-SIDE ONLY now) ----------
        document.getElementById('resetAll').onclick = () => {
            // Capture whether the keyboard pattern is currently active.  When
            // resetting while keyboard mode is active we want to keep the
            // keyboard pattern selected so that the key bindings remain live.
            const wasKeyboard = (uiAnim.pattern === 'keyboard');

            // Stop any running animation and update the play/pause state.  This
            // call always executes, even for keyboard mode, so that any stray
            // animations are terminated.
            pause();
            setToggleUI(false);

            // Only clear the current pattern when not in keyboard mode.  Leaving
            // the pattern as 'keyboard' ensures that key input remains
            // responsive immediately after reset.  If we were to set the
            // pattern to 'none', subsequent presses of the Play button would
            // unintentionally restart the previously selected animation.
            if (!wasKeyboard) {
                uiAnim.pattern = 'none';
            }

            // Reset translation and rotation.  Do not disturb the left-side view.
            ['x', 'y', 'z'].forEach(k => position[k] = 0);
            ['rx', 'ry', 'rz'].forEach(k => rotation[k] = 0);
            mouseZ = 0;
            ball = null;
            setIKStatus(true, '');

            // Clear any pressed keys so that stale key states do not carry over.
            for (const k in keysPressed) keysPressed[k] = false;

            // Reset UI controls for translation and rotation.  Keep the view
            // controls intact so the user's perspective does not jump.
            const pairs = [
                ['x', 'xSlider', 'xInput', 0],
                ['y', 'ySlider', 'yInput', 0],
                ['z', 'zSlider', 'zInput', 0],
                ['rx', 'rxSlider', 'rxInput', 0],
                ['ry', 'rySlider', 'ryInput', 0],
                ['rz', 'rzSlider', 'rzInput', 0],
            ];
            programmatic.on = true;
            for (const [k, sl, inId, val] of pairs) {
                const s = document.getElementById(sl);
                const i = document.getElementById(inId);
                if (s && i) {
                    s.value = val;
                    i.value = val;
                }
            }
            programmatic.on = false;

            // If we reset during keyboard mode, clear any residual animation state
            // so that no old pattern resumes inadvertently.
            if (wasKeyboard && animator) {
                animator.cur = null;
                animator.next = null;
            }
        };

        // ===== Round-trip with optimizer (URL hash) =========================
        // Format: simulator.html#layout=<base64-encoded-JSON>
        // The optimizer sends this hash; we decode, set importedLayout, and
        // rebuild the platform using the explicit anchors from the optimizer.

        function _decodeLayoutHash(s) {
            try {
                const bin = atob(s);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return JSON.parse(new TextDecoder().decode(bytes));
            } catch (e) { console.warn('Invalid layout hash:', e); return null; }
        }
        function _encodeLayoutHash(obj) {
            const bytes = new TextEncoder().encode(JSON.stringify(obj));
            let bin = '';
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
        }

        function applyImportedLayout(layout, { silent = false } = {}) {
            importedLayout = layout;
            const notice = document.getElementById('layoutImportNotice');
            if (notice) notice.style.display = layout ? 'block' : 'none';
            // Disable left-panel sliders so the user knows they're not controlling
            // geometry while an external layout is loaded
            const leftSliders = document.querySelectorAll('#controls-left input, #controls-left button');
            for (const el of leftSliders) {
                if (el.id !== 'rodLengthReset') {  // keep reset buttons visually consistent
                    el.disabled = !!layout;
                }
            }
            // Sync ball joint limit from layout metadata if provided
            if (layout && Number.isFinite(layout.ball_joint_max_deg)) {
                const bjEl = document.getElementById('ballJointLimitInput');
                if (bjEl) bjEl.value = layout.ball_joint_max_deg;
            }
            // Sync servo range from layout if provided
            if (layout && Array.isArray(layout.servo_range) && layout.servo_range.length === 2) {
                const sMin = document.getElementById('servoMinInput');
                const sMax = document.getElementById('servoMaxInput');
                if (sMin) sMin.value = layout.servo_range[0];
                if (sMax) sMax.value = layout.servo_range[1];
                opts.servoRange = [layout.servo_range[0] * Math.PI / 180, layout.servo_range[1] * Math.PI / 180];
            }
            rebuildPlatform();
            if (animator) {
                animator.cur = null;
                animator.next = null;
            }
            if (!silent && layout) {
                console.info('Imported layout applied:', layout);
            }
        }

        // On startup, look for #layout=... in the URL
        (function consumeIncomingHash() {
            const h = window.location.hash || '';
            const m = h.match(/[#&]layout=([^&]+)/);
            if (!m) return;
            const layout = _decodeLayoutHash(decodeURIComponent(m[1]));
            if (!layout) return;
            applyImportedLayout(layout);
            // Clear the hash so a refresh doesn't re-import indefinitely
            history.replaceState(null, '', window.location.pathname + window.location.search);
        })();

        // Extract the current platform geometry into the optimizer's layout JSON
        function getCurrentLayoutForExport() {
            if (!platform || !platform.B || !platform.P) return null;
            const baseAnchors      = platform.B.map((p) => p.slice());
            const platformAnchors  = platform.P.map((p) => p.slice());
            const betaAngles       = [];
            for (let i = 0; i < 6; i++) {
                betaAngles.push(Math.atan2(platform.sinBeta[i] || 0, platform.cosBeta[i] || 0));
            }
            const servoRangeDeg = (platform.servoRange || opts.servoRange).map((r) => r * 180 / Math.PI);
            const bjEl = document.getElementById('ballJointLimitInput');
            const ballJointMaxDeg = bjEl ? Number(bjEl.value) : 45;
            return {
                base_anchors: baseAnchors,
                platform_anchors: platformAnchors,
                beta_angles: betaAngles,
                horn_length: platform.hornLength,
                rod_length: platform.rodLength,
                servo_range: servoRangeDeg,
                home_height: platform.T0 ? platform.T0[2] : 0,
                ball_joint_max_deg: Number.isFinite(ballJointMaxDeg) ? ballJointMaxDeg : 45,
            };
        }

        // "Open in Optimizer" → packages current geometry, opens optimizer in a new tab
        const openInOptimizerBtn = document.getElementById('openInOptimizer');
        if (openInOptimizerBtn) {
            openInOptimizerBtn.addEventListener('click', () => {
                const layout = getCurrentLayoutForExport();
                if (!layout) {
                    alert('Platform not initialized — try moving a slider first.');
                    return;
                }
                const hash = _encodeLayoutHash(layout);
                window.open(`./index.html#layout=${hash}`, '_blank', 'noopener');
            });
        }

        // "Clear imported layout" link → drop importedLayout, re-enable sliders, rebuild
        const clearImportedLink = document.getElementById('clearImportedLayout');
        if (clearImportedLink) {
            clearImportedLink.addEventListener('click', (e) => {
                e.preventDefault();
                applyImportedLayout(null);
            });
        }
    </script>
</body>

</html>