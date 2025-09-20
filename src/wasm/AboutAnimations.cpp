#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <random>

struct AboutFlower {
    float x, y, z, vx, vy, rot, scale, time;
    int id, color;
    AboutFlower(int i) : x(0), y(0), z(0), vx(0), vy(0), rot(0), scale(1), time(0), id(i), color(i % 6) {}
};

class AboutAnimationSystem {
    std::vector<AboutFlower> flowers;
    std::mt19937 rng{std::random_device{}()};
    float width, height;
    
public:
    void setDimensions(float w, float h) { width = w; height = h; }
    
    void init() {
        flowers.clear();
        std::uniform_real_distribution<float> xDist(-width/100.0f, width/100.0f);
        std::uniform_real_distribution<float> yDist(-height/100.0f, height/100.0f);
        std::uniform_real_distribution<float> zDist(0.0f, 3.0f);
        std::uniform_real_distribution<float> scaleDist(0.4f, 0.8f);
        std::uniform_real_distribution<float> velDist(-0.005f, 0.005f);
        
        for (int i = 0; i < 12; i++) {
            AboutFlower flower(i);
            flower.x = xDist(rng);
            flower.y = yDist(rng);
            flower.z = zDist(rng);
            flower.scale = scaleDist(rng);
            flower.vx = velDist(rng);
            flower.vy = velDist(rng) * 0.3f;
            flower.rot = rng() % 360;
            flowers.push_back(flower);
        }
    }
    
    void update(float dt) {
        for (auto& flower : flowers) {
            flower.time += dt;
            
            flower.x += flower.vx + std::cos(flower.time * 0.3f + flower.id) * 0.002f;
            flower.y += flower.vy + std::sin(flower.time * 1.5f + flower.id) * 0.003f;
            flower.rot += 8.0f * dt;
            
            float boundary = width / 100.0f + 2.0f;
            if (flower.x > boundary) flower.x = -boundary;
            if (flower.x < -boundary) flower.x = boundary;
            
            float yBoundary = height / 80.0f;
            if (flower.y > yBoundary) flower.y = -yBoundary;
            if (flower.y < -yBoundary) flower.y = yBoundary;
        }
    }
    
    emscripten::val getData() {
        auto result = emscripten::val::array();
        for (const auto& flower : flowers) {
            auto data = emscripten::val::object();
            data.set("id", flower.id);
            data.set("x", flower.x);
            data.set("y", flower.y);
            data.set("z", flower.z);
            data.set("rotation", flower.rot);
            data.set("scale", flower.scale);
            data.set("color", flower.color);
            result.call<void>("push", data);
        }
        return result;
    }
    
    void resize(float w, float h) {
        float sx = w / width, sy = h / height;
        setDimensions(w, h);
        for (auto& flower : flowers) {
            flower.x *= sx;
            flower.y *= sy;
        }
    }
    
    void clear() { flowers.clear(); }
};

static AboutAnimationSystem sys;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void aboutInit(float w, float h) { sys.setDimensions(w, h); sys.init(); }
    EMSCRIPTEN_KEEPALIVE void aboutUpdate(float dt) { sys.update(dt); }
    EMSCRIPTEN_KEEPALIVE void aboutResize(float w, float h) { sys.resize(w, h); }
    EMSCRIPTEN_KEEPALIVE void aboutClear() { sys.clear(); }
}

EMSCRIPTEN_BINDINGS(about_animations) {
    emscripten::class_<AboutAnimationSystem>("AboutAnimationSystem")
        .function("setDimensions", &AboutAnimationSystem::setDimensions)
        .function("init", &AboutAnimationSystem::init)
        .function("update", &AboutAnimationSystem::update)
        .function("getData", &AboutAnimationSystem::getData)
        .function("resize", &AboutAnimationSystem::resize)
        .function("clear", &AboutAnimationSystem::clear);
}